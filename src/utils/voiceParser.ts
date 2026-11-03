import { Product } from '../types';

export interface ParsedVoiceCommand {
  type: 'venta' | 'compra' | 'gasto';
  title: string;
  category: string;
  amount: number;
  qty: number;
  unit: string;
  matchedProductId?: string;
  confidence: 'high' | 'medium' | 'low';
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  doce: 12,
  quince: 15,
  veinte: 20,
  veinticinco: 25,
  treinta: 30,
  cincuenta: 50,
  medio: 0.5,
  media: 0.5,
};

export function parseVoiceCommandLocally(
  rawTranscript: string,
  inventory: Product[] = []
): ParsedVoiceCommand {
  const text = rawTranscript.toLowerCase().trim();

  // 1. Determine transaction type
  let type: 'venta' | 'compra' | 'gasto' = 'venta';
  if (
    text.includes('gasto') ||
    text.includes('pago') ||
    text.includes('pagué') ||
    text.includes('luz') ||
    text.includes('agua') ||
    text.includes('alquiler') ||
    text.includes('flete')
  ) {
    type = 'gasto';
  } else if (
    text.includes('compra') ||
    text.includes('compré') ||
    text.includes('adquisición') ||
    text.includes('mercadería') ||
    text.includes('pedido')
  ) {
    type = 'compra';
  }

  // 2. Extract numeric quantity
  let qty = 1;
  const numRegex = /(\d+(?:[.,]\d+)?)\s*(?:uds?|unidades?|kg|kilos?|litros?|l)?/i;
  const numMatch = text.match(numRegex);

  if (numMatch) {
    qty = parseFloat(numMatch[1].replace(',', '.'));
  } else {
    // Check written words
    for (const [word, val] of Object.entries(NUMBER_WORDS)) {
      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      if (wordRegex.test(text)) {
        qty = val;
        break;
      }
    }
  }

  // 3. Extract explicit monetary amount (e.g., "por 15 bolivianos", "20 pesos", "35 bs")
  let explicitAmount: number | null = null;
  const amountRegex = /(\d+(?:[.,]\d+)?)\s*(?:bolivianos?|pesos?|bs\.?|lucas?)/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch) {
    explicitAmount = parseFloat(amountMatch[1].replace(',', '.'));
  }

  // 4. Try matching with inventory products
  let matchedProduct: Product | undefined;
  for (const prod of inventory) {
    const pName = prod.name.toLowerCase();
    const words = pName.split(/\s+/).filter((w) => w.length > 2);
    // check exact inclusion
    if (text.includes(pName)) {
      matchedProduct = prod;
      break;
    }
    // check partial word matches (e.g., "coca" in "Coca-Cola", "tomate" in "Tomate perita")
    const matchCount = words.filter((w) => text.includes(w)).length;
    if (matchCount >= 2 || (words.length === 1 && matchCount === 1)) {
      matchedProduct = prod;
      break;
    }
  }

  // If no multi-word match, check common single keywords
  if (!matchedProduct) {
    matchedProduct = inventory.find((p) => {
      const pLow = p.name.toLowerCase();
      if (text.includes('coca') && pLow.includes('coca')) return true;
      if (text.includes('leche') && pLow.includes('leche')) return true;
      if (text.includes('tomate') && pLow.includes('tomate')) return true;
      if (text.includes('arroz') && pLow.includes('arroz')) return true;
      if (text.includes('aceite') && pLow.includes('aceite')) return true;
      if (text.includes('carne') && pLow.includes('carne')) return true;
      if (text.includes('pan') && pLow.includes('pan')) return true;
      return false;
    });
  }

  if (matchedProduct) {
    const finalAmount = explicitAmount !== null ? explicitAmount : matchedProduct.price * qty;
    return {
      type,
      title: `${qty} ${matchedProduct.unit}. ${matchedProduct.name}`,
      category: matchedProduct.category,
      amount: Math.round(finalAmount * 100) / 100,
      qty,
      unit: matchedProduct.unit,
      matchedProductId: matchedProduct.id,
      confidence: 'high',
    };
  }

  // 5. If no inventory product matched, build generic title and category
  let cleanTitle = text
    .replace(/\b(registrar|anotar|poner|hacer|una|un|de|por|para|la|el|los|las|venta|gasto|compra|bolivianos?|pesos?|bs\.?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (explicitAmount !== null) {
    cleanTitle = cleanTitle.replace(new RegExp(`\\b${explicitAmount}\\b`, 'g'), ' ').replace(/\s+/g, ' ').trim();
  }

  if (!cleanTitle) {
    cleanTitle = type === 'venta' ? 'Venta de mostrador' : type === 'gasto' ? 'Gasto general' : 'Compra de mercadería';
  } else {
    if (type === 'gasto' && !cleanTitle.toLowerCase().includes('pago')) {
      cleanTitle = `Pago de ${cleanTitle}`;
    }
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  }

  let category = 'Varios';
  if (type === 'gasto') {
    if (text.includes('luz') || text.includes('agua') || text.includes('gas') || text.includes('internet')) {
      category = 'Servicios';
    } else if (text.includes('alquiler')) {
      category = 'Alquiler';
    } else if (text.includes('flete') || text.includes('transporte') || text.includes('pasaje')) {
      category = 'Fletes / Transporte';
    } else {
      category = 'Gastos Operativos';
    }
  } else if (type === 'compra') {
    category = 'Mercadería';
  } else {
    category = 'Venta Rápida';
  }

  const finalAmount = explicitAmount !== null ? explicitAmount : Math.max(1, qty * 10);

  return {
    type,
    title: cleanTitle,
    category,
    amount: Math.round(finalAmount * 100) / 100,
    qty,
    unit: 'ud',
    confidence: explicitAmount !== null ? 'medium' : 'low',
  };
}
