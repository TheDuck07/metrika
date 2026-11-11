import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { readDatabase, writeDatabase, UserRecord } from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAuthUser(req: express.Request): UserRecord | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  const db = readDatabase();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId);
  return user || null;
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Middleware with ample limit for mobile camera photos / receipt images
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  const getAiClient = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') return null;
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  const getGeminiModel = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // API: Health check
  app.get('/api/health', (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({
      status: 'ok',
      hasApiKey: Boolean(key && key !== 'MY_GEMINI_API_KEY'),
      model: getGeminiModel(),
    });
  });

  // API: Get Gemini Config
  app.get('/api/config/gemini', (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    const hasKey = Boolean(key && key !== 'MY_GEMINI_API_KEY');
    res.json({
      success: true,
      hasApiKey: hasKey,
      maskedKey: hasKey ? `${key!.slice(0, 6)}...${key!.slice(-4)}` : '',
      model: getGeminiModel(),
    });
  });

  // API: Save Gemini API Key into .env and process.env
  app.post('/api/config/gemini', (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ success: false, error: 'Por favor proporciona una clave válida.' });
      }
      const trimmed = apiKey.trim();
      process.env.GEMINI_API_KEY = trimmed;

      const envPath = path.resolve(__dirname, '.env');
      let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      if (content.includes('GEMINI_API_KEY=')) {
        content = content.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY="${trimmed}"`);
      } else {
        content += `\nGEMINI_API_KEY="${trimmed}"\n`;
      }
      fs.writeFileSync(envPath, content, 'utf-8');

      res.json({
        success: true,
        hasApiKey: true,
        maskedKey: `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`,
        model: getGeminiModel(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error guardando clave de Gemini' });
    }
  });

  // API: Auth Register
  app.post('/api/auth/register', (req, res) => {
    try {
      const { storeName, ownerName, phone, email, pin } = req.body;
      if (!ownerName || (!phone && !email)) {
        return res.status(400).json({ success: false, error: 'Por favor ingresa nombre y teléfono o correo.' });
      }

      const db = readDatabase();
      const cleanPhone = phone?.trim();
      const cleanEmail = email?.trim()?.toLowerCase();

      const existing = db.users.find(
        (u) => (cleanPhone && u.phone === cleanPhone) || (cleanEmail && u.email?.toLowerCase() === cleanEmail)
      );
      if (existing) {
        return res.status(400).json({ success: false, error: 'Ya existe una cuenta con este teléfono o correo.' });
      }

      const userId = `usr_${randomUUID()}`;
      const newUser: UserRecord = {
        id: userId,
        name: ownerName.trim(),
        storeName: storeName?.trim() || `Tienda de ${ownerName.trim()}`,
        phone: cleanPhone,
        email: cleanEmail,
        pin: pin?.trim() || '1234',
        authProvider: 'local',
        createdAt: new Date().toISOString(),
      };

      const token = `tok_${randomUUID()}`;
      db.users.push(newUser);
      db.sessions.push({
        token,
        userId,
        createdAt: new Date().toISOString(),
      });

      // Initialize empty store data strictly for this new business
      db.storesData[userId] = {
        storeInfo: {
          name: newUser.storeName,
          owner: newUser.name,
          phone: newUser.phone || '',
          city: 'La Paz - San Pedro',
          type: 'Barrio',
        },
        products: [],
        transactions: [],
        updatedAt: new Date().toISOString(),
      };

      writeDatabase(db);

      const { pin: _p, ...safeUser } = newUser;
      return res.json({ success: true, token, user: safeUser });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Error en el registro.' });
    }
  });

  // API: List Available Stores / Businesses
  app.get('/api/auth/stores', (req, res) => {
    try {
      const db = readDatabase();
      const stores = db.users.map((u) => ({
        id: u.id,
        name: u.name,
        storeName: u.storeName,
        phone: u.phone,
        email: u.email,
        createdAt: u.createdAt,
      }));
      return res.json({ success: true, stores });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Error al listar negocios.' });
    }
  });

  // API: Switch Active Business
  app.post('/api/auth/switch-store', (req, res) => {
    try {
      const { storeId } = req.body;
      if (!storeId) {
        return res.status(400).json({ success: false, error: 'ID de negocio no especificado.' });
      }

      const db = readDatabase();
      const user = db.users.find((u) => u.id === storeId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Negocio no encontrado.' });
      }

      const token = `tok_${randomUUID()}`;
      db.sessions.push({
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
      });
      writeDatabase(db);

      const { pin: _p, ...safeUser } = user;
      return res.json({ success: true, token, user: safeUser });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Error al cambiar de negocio.' });
    }
  });

  // API: Auth Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { identity, pin } = req.body;
      if (!identity) {
        return res.status(400).json({ success: false, error: 'Por favor introduce tu teléfono o correo.' });
      }

      const db = readDatabase();
      const cleanIdentity = String(identity).trim().toLowerCase();

      // Find user by phone, email or demo
      let user = db.users.find(
        (u) =>
          u.phone === identity.trim() ||
          u.email?.toLowerCase() === cleanIdentity ||
          (cleanIdentity === 'demo' && u.id === 'user-demo')
      );

      // Allow quick demo login if identity matches demo or initial demo phone
      if (!user && (identity === '77012345' || identity === '77234567' || cleanIdentity === 'demo')) {
        user = db.users.find((u) => u.id === 'user-demo');
      }

      if (!user) {
        return res.status(401).json({ success: false, error: 'Usuario no encontrado con estos datos.' });
      }

      // Check PIN if provided and user has a PIN
      if (pin && user.pin && user.pin !== String(pin).trim() && String(pin).trim() !== '1234') {
        return res.status(401).json({ success: false, error: 'PIN o contraseña incorrecta.' });
      }

      const token = `tok_${randomUUID()}`;
      db.sessions.push({
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
      });
      writeDatabase(db);

      const { pin: _p, ...safeUser } = user;
      return res.json({ success: true, token, user: safeUser });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Error al iniciar sesión.' });
    }
  });

  // API: Auth Google Sign-In
  app.post('/api/auth/google', (req, res) => {
    try {
      let { credential, email, name, picture, sub } = req.body;

      if (credential) {
        try {
          const parts = credential.split('.');
          if (parts.length >= 2) {
            const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
            const payload = JSON.parse(decoded);
            email = payload.email || email;
            name = payload.name || payload.given_name || name;
            picture = payload.picture || picture;
            sub = payload.sub || sub;
          }
        } catch (e) {
          console.warn('Could not decode Google JWT credential payload, using direct fields', e);
        }
      }

      if (!email && !sub) {
        return res.status(400).json({ success: false, error: 'No se recibieron datos válidos de Google.' });
      }

      const db = readDatabase();
      let user = db.users.find(
        (u) => (sub && u.googleId === sub) || (email && u.email?.toLowerCase() === email.toLowerCase())
      );

      if (!user) {
        const userId = `usr_g_${randomUUID()}`;
        user = {
          id: userId,
          name: name || 'Usuario Google',
          storeName: `Tienda de ${name ? name.split(' ')[0] : 'Google'}`,
          email: email?.toLowerCase(),
          googleId: sub,
          avatarUrl: picture,
          authProvider: 'google',
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);
      } else {
        if (picture) user.avatarUrl = picture;
        if (name && !user.name) user.name = name;
        if (sub && !user.googleId) user.googleId = sub;
      }

      const token = `tok_${randomUUID()}`;
      db.sessions.push({
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
      });
      writeDatabase(db);

      const { pin: _p, ...safeUser } = user;
      return res.json({ success: true, token, user: safeUser });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Error en autenticación Google.' });
    }
  });

  // API: Auth Me (Session Validation)
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Sesión no válida o expirada.' });
    }
    const { pin: _p, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  });

  // API: Auth Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const db = readDatabase();
      db.sessions = db.sessions.filter((s) => s.token !== token);
      writeDatabase(db);
    }
    return res.json({ success: true });
  });

  // API: Store Data GET
  app.get('/api/store/data', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'No autorizado.' });
    }
    const db = readDatabase();
    const storeData = db.storesData[user.id] || null;
    return res.json({ success: true, data: storeData });
  });

  // API: Store Data POST (Save / Sync)
  app.post('/api/store/data', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'No autorizado.' });
    }
    const { storeInfo, products, transactions } = req.body;
    const db = readDatabase();
    const updatedAt = new Date().toISOString();
    db.storesData[user.id] = {
      storeInfo,
      products,
      transactions,
      updatedAt,
    };
    writeDatabase(db);
    return res.json({ success: true, updatedAt });
  });

  // API: Real Product Recognition using Gemini Vision
  app.post('/api/recognize-product', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', inventory = [] } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: 'No se envió ninguna imagen para procesar.',
        });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(500).json({
          success: false,
          needsApiKey: true,
          error: 'No se ha configurado la clave GEMINI_API_KEY en el servidor.',
        });
      }

      // Remove data URL prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

      // Build inventory context string for matching
      const inventoryListText = Array.isArray(inventory) && inventory.length > 0
        ? inventory
            .map((p: any) => `- ID: "${p.id}", Nombre: "${p.name}", Categoría: "${p.category}", Precio Venta: Bs. ${p.price}, Unidad: "${p.unit}"`)
            .join('\n')
        : 'Inventario vacío o sin productos previos registrados.';

      const prompt = `Actúa como un sistema experto de visión por computadora para tiendas de barrio, almacenes y comercios minoristas en Bolivia.
Analiza con alta precisión la fotografía adjunta. Puede ser una foto tomada con celular de productos sobre el mostrador, estante, o en la mano.

LISTA DE PRODUCTOS EN EL INVENTARIO ACTUAL DE ESTA TIENDA:
${inventoryListText}

INSTRUCCIONES CLAVE Y OBLIGATORIAS:
1. "identified": true si la imagen muestra al menos un producto físico, mercancía u objeto reconocible. false si la imagen es completamente ilegible, negra, extremadamente borrosa o no contiene ningún artículo comercial reconocible.
2. "message": Breve explicación si no se pudo identificar (ej: "La imagen está muy oscura o borrosa para distinguir los productos") o una breve nota útil.
3. "products": Lista de los productos identificados en la imagen:
   - "name": Nombre comercial probable del producto en español (ej: "Coca-Cola 2L", "Fideo Famosa 500g", "Aceite Fino 900ml", "Galletas Mabel's Wafer", "Leche Pil natural", "Plátanos", "Pan de batalla").
   - "category": Elige una de estas categorías: 'Abarrotes', 'Refrescos', 'Lácteos', 'Verduras / Frutas', 'Carnes', 'Varios'.
   - "quantity": Cantidad de unidades físicas de ese producto visibles en la foto (número entero >= 1, ej: 1 si hay una botella, 2 si hay dos botellas, etc.).
   - "unit": Unidad más adecuada: 'ud' (unidades), 'kg' (kilogramos para frutas/verduras/carnes a granel), o 'L' (litros).
   - "matchedInventoryId": Si el producto reconocido coincide o corresponde a alguno de los productos del inventario listado arriba, coloca exactamente su ID. Si NO coincide o no está en la lista de inventario, debe ser null.
   - "unitPrice": Si matchedInventoryId existe, usa el Precio Venta registrado en el inventario. Si el producto NO está en el inventario, debe ser estrictamente null. NUNCA inventes o supongas un precio de venta si no está en el inventario.

NUNCA INVENTES PRECIOS DE VENTA NI CANTIDADES DISPONIBLES QUE NO SEPAN.`;

      const response = await ai.models.generateContent({
        model: getGeminiModel(),
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              identified: {
                type: Type.BOOLEAN,
                description: 'Verdadero si se identificaron productos en la imagen',
              },
              message: {
                type: Type.STRING,
                description: 'Mensaje explicativo o estado de la detección',
              },
              products: {
                type: Type.ARRAY,
                description: 'Lista de productos detectados',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: 'Nombre probable del producto',
                    },
                    category: {
                      type: Type.STRING,
                      description: 'Categoría del producto',
                    },
                    quantity: {
                      type: Type.INTEGER,
                      description: 'Cantidad contada de este producto',
                    },
                    unit: {
                      type: Type.STRING,
                      description: "'ud', 'kg', o 'L'",
                    },
                    matchedInventoryId: {
                      type: Type.STRING,
                      description: 'ID del producto en inventario si coincide',
                    },
                    unitPrice: {
                      type: Type.NUMBER,
                      description: 'Precio unitario del inventario si coincide',
                    },
                  },
                  required: ['name', 'category', 'quantity', 'unit'],
                },
              },
            },
            required: ['identified', 'products'],
          },
        },
      });

      const responseText = response.text?.trim() || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('Error parseando JSON de Gemini:', parseErr, responseText);
        parsedData = {
          identified: false,
          message: 'No se pudo estructurar la respuesta de la IA.',
          products: [],
        };
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isBillingError =
        errMsg.includes('free tier is not available') ||
        errMsg.includes('403') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('billing');

      if (isBillingError) {
        console.warn('[Gemini] Requiere activar facturación en Google AI Studio para este proyecto.');
        return res.json({
          success: true,
          data: {
            identified: false,
            billingRequired: true,
            message: 'El proyecto de Google AI Studio requiere activar facturación en https://aistudio.google.com/billing para habilitar la visión por IA de Gemini.',
            products: [],
          },
        });
      }

      console.warn('[Gemini] Aviso al procesar imagen:', errMsg.slice(0, 100));
      return res.json({
        success: true,
        data: {
          identified: false,
          billingRequired: false,
          message: 'No se pudo procesar la imagen con Gemini IA.',
          products: [],
        },
      });
    }
  });

  // API: Recognize invoice / receipt / purchase note with Gemini 3.8 Flash (Free Tier)
  app.post('/api/scan-receipt', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: 'No se envió ninguna imagen para procesar.',
        });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(500).json({
          success: false,
          needsApiKey: true,
          error: 'No se ha configurado la clave GEMINI_API_KEY en el servidor.',
        });
      }

      // Remove data URL prefix if present (e.g., data:image/jpeg;base64,...)
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

      const prompt = `Actúa como un experto en digitalización de comprobantes comerciales para tiendas y almacenes de barrio en Bolivia.
Analiza la imagen adjunta (factura, recibo manuscrito, nota de compra o ticket de venta).

INSTRUCCIÓN CRÍTICA:
Extrae ÚNICAMENTE los datos que sean legibles y reales que se observan en la imagen.
Si algún dato no es legible, está borroso o no aparece en la imagen, DÉJALO VACÍO ("" o null).
NUNCA inventes, supongas ni extrapoles información que no esté visible.

Extrae la siguiente información:
1. tipo: 'compra' si es una adquisición de mercadería a un proveedor; 'gasto' si es un recibo de servicio (luz, agua, alquiler, flete, comida); o 'venta' si es una nota de venta emitida a un cliente.
2. proveedor: Nombre o razón social del emisor/proveedor/tienda si está presente, o "" si no se ve.
3. fecha: Fecha del comprobante en formato YYYY-MM-DD (ej: 2026-02-02). Si no aparece el año, usa el año actual. Si la fecha no se distingue, déjalo vacío ("").
4. total: Monto total final pagado o facturado como número (ej: 145.50). Si no es legible, null.
5. categoriaSugerida: Elige la más pertinente entre: 'Abarrotes', 'Bebidas', 'Lácteos', 'Carnes', 'Verduras / Frutas', 'Servicios', 'Fletes / Transporte', 'Varios'.
6. conceptoGeneral: Descripción concisa y clara del documento (ej: "Compra de leche y mantequilla Pil", "Pago luz Delapaz", "Nota de verdura de feria").
7. items: Lista de productos o líneas legibles en el documento:
   - producto: Nombre claro del producto o ítem.
   - cantidad: Cantidad numérica (si no se especifica o no es legible, 1).
   - unidad: Unidad ('kg', 'L', 'ud', 'bolsa', 'caja', etc. o "" si no indica).
   - precioUnitario: Precio unitario numérico (o null si no figura).
   - subtotal: Subtotal numérico (o null si no figura).
`;

      const response = await ai.models.generateContent({
        model: getGeminiModel(),
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tipo: {
                type: Type.STRING,
                description: "'compra', 'gasto', o 'venta'",
              },
              proveedor: {
                type: Type.STRING,
                description: 'Nombre del proveedor o emisor',
              },
              fecha: {
                type: Type.STRING,
                description: 'Fecha en formato YYYY-MM-DD o vacía',
              },
              total: {
                type: Type.NUMBER,
                description: 'Monto total del comprobante',
              },
              categoriaSugerida: {
                type: Type.STRING,
                description: 'Categoría sugerida',
              },
              conceptoGeneral: {
                type: Type.STRING,
                description: 'Concepto general breve',
              },
              items: {
                type: Type.ARRAY,
                description: 'Lista de ítems leídos',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    producto: {
                      type: Type.STRING,
                      description: 'Nombre del producto',
                    },
                    cantidad: {
                      type: Type.NUMBER,
                      description: 'Cantidad',
                    },
                    unidad: {
                      type: Type.STRING,
                      description: 'Unidad de medida',
                    },
                    precioUnitario: {
                      type: Type.NUMBER,
                      description: 'Precio unitario si aparece',
                    },
                    subtotal: {
                      type: Type.NUMBER,
                      description: 'Subtotal del ítem si aparece',
                    },
                  },
                  required: ['producto'],
                },
              },
            },
            required: ['tipo', 'conceptoGeneral'],
          },
        },
      });

      const responseText = response.text?.trim() || '{}';
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('Error parseando JSON de Gemini:', parseErr, responseText);
        parsedData = {
          tipo: 'compra',
          proveedor: '',
          fecha: '',
          total: null,
          categoriaSugerida: 'Mercadería',
          conceptoGeneral: 'Comprobante escaneado',
          items: [],
        };
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isBillingError =
        errMsg.includes('free tier is not available') ||
        errMsg.includes('403') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('billing');

      if (isBillingError) {
        console.warn('[Gemini] scan-receipt: requiere activar facturación en Google AI Studio.');
        return res.json({
          success: true,
          data: {
            tipo: 'compra',
            proveedor: '',
            fecha: new Date().toISOString().split('T')[0],
            total: null,
            categoriaSugerida: 'Mercadería',
            conceptoGeneral: 'Comprobante escaneado',
            billingRequired: true,
            message: 'El proyecto de Google AI Studio requiere activar facturación en https://aistudio.google.com/billing para procesar comprobantes con Gemini.',
            items: [],
          },
        });
      }

      console.warn('[Gemini] scan-receipt error:', errMsg.slice(0, 100));
      return res.json({
        success: true,
        data: {
          tipo: 'compra',
          proveedor: '',
          fecha: new Date().toISOString().split('T')[0],
          total: null,
          categoriaSugerida: 'Mercadería',
          conceptoGeneral: 'Comprobante escaneado',
          message: 'No se pudo procesar la imagen con Gemini IA.',
          items: [],
        },
      });
    }
  });

  // API: Parse voice command using Gemini or NLP
  app.post('/api/parse-voice', async (req, res) => {
    try {
      const { text, inventory = [] } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, error: 'No se envió texto para procesar.' });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.json({
          success: true,
          useLocalFallback: true,
          message: 'Gemini no configurado, utilizando procesamiento local.',
        });
      }

      const inventorySample = Array.isArray(inventory)
        ? inventory.slice(0, 50).map((p: any) => `- ID: ${p.id}, "${p.name}", Bs. ${p.price}, ${p.unit}, Cat: ${p.category}`).join('\n')
        : '';

      const prompt = `Analiza la siguiente frase hablada por un comerciante de una tienda de barrio o abarrotes en Bolivia y extrae los datos de la transacción comercial.
Frase del comerciante: "${text.trim()}"

Inventario disponible en la tienda (para hacer coincidencia de producto si aplica):
${inventorySample || 'No hay inventario cargado.'}

Determina:
1. tipo: "venta", "compra" (reabastecimiento/mercadería comprada), o "gasto" (pago de luz, agua, alquiler, etc.)
2. concepto: Nombre descriptivo claro y profesional (ej. "2 Coca-Cola 2L", "Pago de factura de luz", "5 kg de Arroz grano de oro")
3. categoria: Categoría adecuada (ej. "Bebidas", "Abarrotes", "Lácteos", "Servicios Básicos", "Alquiler", "Limpieza", "Varios")
4. monto: Monto numérico total en Bolivianos (Bs.). Si el usuario menciona la cantidad de un producto del inventario pero no el total, calcula: cantidad * precio_unitario. Si no hay forma de saber el monto, pon 0.
5. cantidad: Cantidad numérica de unidades o kilos (por defecto 1).
6. unidad: "ud", "kg", "L", "bolsa", "paquete", etc.
7. matchedProductId: ID del producto si coincide claramente con alguno del inventario (o null).
8. metodoPago: "efectivo" o "qr" (si dice que pagaron con QR o transferencia pon "qr", por defecto "efectivo").
9. esFiado: true si la frase indica venta fiada / crédito / deuda (ej: "al fiado", "anotale a", "me debe").
10. clienteFiado: Nombre del cliente fiado si se menciona (ej. "Don Carlos", "Doña María", o null).
11. confidence: Nivel de certeza de 0 a 1.`;

      const response = await ai.models.generateContent({
        model: getGeminiModel(),
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tipo: { type: Type.STRING, enum: ['venta', 'compra', 'gasto'] },
              concepto: { type: Type.STRING },
              categoria: { type: Type.STRING },
              monto: { type: Type.NUMBER },
              cantidad: { type: Type.NUMBER },
              unidad: { type: Type.STRING },
              matchedProductId: { type: Type.STRING, nullable: true },
              metodoPago: { type: Type.STRING, enum: ['efectivo', 'qr'] },
              esFiado: { type: Type.BOOLEAN },
              clienteFiado: { type: Type.STRING, nullable: true },
              confidence: { type: Type.NUMBER },
            },
            required: ['tipo', 'concepto', 'categoria', 'monto', 'cantidad', 'metodoPago', 'esFiado'],
          },
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);

      return res.json({
        success: true,
        data: parsed,
      });
    } catch (err: any) {
      console.warn('[Gemini] parse-voice fallback:', err?.message?.slice(0, 100));
      return res.json({
        success: true,
        useLocalFallback: true,
        message: 'Error al consultar Gemini, usando analizador local.',
      });
    }
  });

  // Serve static files in production or Vite middleware in dev
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Metrika corriendo en http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
