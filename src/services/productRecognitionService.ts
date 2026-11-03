import { Product, ProductCategory } from '../types';

export interface RecognizedProductItem {
  id: string;
  name: string;
  category: ProductCategory;
  quantity: number;
  unit: 'ud' | 'kg' | 'L';
  matchedInventoryId: string | null;
  unitPrice: number | null; // Must be null if not in inventory - never invented!
}

export interface RecognitionResult {
  identified: boolean;
  message: string;
  products: RecognizedProductItem[];
  billingRequired?: boolean;
}

/**
 * Sends a captured or uploaded photo to the backend Gemini 3.8 Flash API
 * to identify products, count quantities, and match against store inventory.
 */
export async function recognizeProductsWithGemini(
  imageBase64: string,
  inventory: Product[]
): Promise<RecognitionResult> {
  try {
    const cleanInventory = inventory.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      unit: p.unit,
    }));

    // Detect mime type
    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('data:image/png')) {
      mimeType = 'image/png';
    } else if (imageBase64.startsWith('data:image/webp')) {
      mimeType = 'image/webp';
    }

    const response = await fetch('/api/recognize-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        inventory: cleanInventory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error del servidor (${response.status})`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'No se pudo interpretar la respuesta de la IA.');
    }

    const data = result.data;

    if (data.billingRequired) {
      return {
        identified: false,
        message:
          data.message ||
          'El proyecto de Google AI Studio requiere activar facturación en https://aistudio.google.com/billing para habilitar la visión por IA de Gemini.',
        products: [],
        billingRequired: true,
      };
    }

    // Process and normalize products
    const products: RecognizedProductItem[] = (data.products || []).map((p: any, idx: number) => {
      // Cross check with inventory to ensure valid price
      let matchedId = p.matchedInventoryId || null;
      let price: number | null = typeof p.unitPrice === 'number' && p.unitPrice > 0 ? p.unitPrice : null;

      if (matchedId) {
        const existing = inventory.find((inv) => inv.id === matchedId);
        if (existing) {
          price = existing.price;
        } else {
          matchedId = null;
        }
      } else {
        // Try to find a exact or close name match in inventory if Gemini didn't supply id
        const candidate = inventory.find(
          (inv) =>
            inv.name.toLowerCase().trim() === (p.name || '').toLowerCase().trim() ||
            p.name.toLowerCase().includes(inv.name.toLowerCase())
        );
        if (candidate) {
          matchedId = candidate.id;
          price = candidate.price;
        }
      }

      // Standardize category
      let category: ProductCategory = 'Abarrotes';
      const rawCat = (p.category || '').toLowerCase();
      if (rawCat.includes('refresco') || rawCat.includes('bebida')) category = 'Refrescos';
      else if (rawCat.includes('lácteo') || rawCat.includes('lacteo')) category = 'Lácteos';
      else if (rawCat.includes('verdura') || rawCat.includes('fruta')) category = 'Verduras / Frutas';
      else if (rawCat.includes('carne')) category = 'Carnes';
      else if (rawCat.includes('vario')) category = 'Varios';

      const unit: 'ud' | 'kg' | 'L' = p.unit === 'kg' ? 'kg' : p.unit === 'L' ? 'L' : 'ud';
      const quantity = typeof p.quantity === 'number' && p.quantity > 0 ? Math.round(p.quantity) : 1;

      return {
        id: `gemini_rec_${Date.now()}_${idx}`,
        name: p.name || 'Producto sin identificar',
        category,
        quantity,
        unit,
        matchedInventoryId: matchedId,
        unitPrice: price, // Remains null if not in inventory! Never invented.
      };
    });

    return {
      identified: Boolean(data.identified) && products.length > 0,
      message: data.message || '',
      products,
      billingRequired: false,
    };
  } catch (err: any) {
    return {
      identified: false,
      message: err?.message || 'Error de conexión con el servicio de reconocimiento.',
      products: [],
      billingRequired: false,
    };
  }
}

