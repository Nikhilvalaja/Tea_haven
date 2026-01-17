// Shipping rates calculator from Ohio
// Base rates are calculated based on distance zones and weight

const OHIO_STATES = {
  // Zone 1: Ohio and neighboring states (Local)
  local: ['OH', 'PA', 'WV', 'KY', 'IN', 'MI'],

  // Zone 2: Midwest and East Coast
  regional: ['IL', 'WI', 'NY', 'NJ', 'MD', 'VA', 'NC', 'SC', 'TN', 'MO', 'IA', 'MN'],

  // Zone 3: West Coast and Southern states
  national: ['CA', 'WA', 'OR', 'TX', 'FL', 'GA', 'AL', 'LA', 'AZ', 'NV', 'CO', 'UT'],

  // Zone 4: Remote states
  remote: ['AK', 'HI', 'ME', 'VT', 'NH', 'MT', 'WY', 'ND', 'SD', 'NM', 'ID']
};

const SHIPPING_RATES = {
  local: {
    base: 4.99,
    perItem: 0.50,
    freeShippingThreshold: 50
  },
  regional: {
    base: 7.99,
    perItem: 0.75,
    freeShippingThreshold: 75
  },
  national: {
    base: 9.99,
    perItem: 1.00,
    freeShippingThreshold: 100
  },
  remote: {
    base: 14.99,
    perItem: 1.50,
    freeShippingThreshold: 150
  }
};

// Tax rates by state (simplified - in production use TaxJar or Avalara API)
const STATE_TAX_RATES = {
  'OH': 0.0575, // Ohio base rate
  'PA': 0.06,
  'NY': 0.08,
  'CA': 0.0725,
  'TX': 0.0625,
  'FL': 0.06,
  'WA': 0.065,
  // Add more states as needed
  'DEFAULT': 0.06 // Default tax rate
};

/**
 * Calculate shipping cost based on destination state and cart details
 * @param {string} state - Two-letter state code
 * @param {number} subtotal - Cart subtotal
 * @param {number} itemCount - Number of items in cart
 * @param {boolean} hasImportedItems - Whether cart contains imported items
 * @returns {object} Shipping calculation details
 */
const calculateShipping = (state, subtotal, itemCount, hasImportedItems = false) => {
  // Determine shipping zone
  let zone = 'national';
  if (OHIO_STATES.local.includes(state)) {
    zone = 'local';
  } else if (OHIO_STATES.regional.includes(state)) {
    zone = 'regional';
  } else if (OHIO_STATES.remote.includes(state)) {
    zone = 'remote';
  }

  const rates = SHIPPING_RATES[zone];

  // Check for free shipping
  if (subtotal >= rates.freeShippingThreshold) {
    return {
      cost: 0,
      zone,
      method: 'Standard Shipping',
      estimatedDays: getEstimatedDays(zone, hasImportedItems),
      freeShipping: true,
      savings: rates.base + (rates.perItem * itemCount)
    };
  }

  // Calculate shipping cost
  const shippingCost = rates.base + (rates.perItem * itemCount);

  return {
    cost: parseFloat(shippingCost.toFixed(2)),
    zone,
    method: 'Standard Shipping',
    estimatedDays: getEstimatedDays(zone, hasImportedItems),
    freeShipping: false,
    freeShippingThreshold: rates.freeShippingThreshold,
    amountForFreeShipping: Math.max(0, rates.freeShippingThreshold - subtotal)
  };
};

/**
 * Get estimated delivery days
 * @param {string} zone - Shipping zone
 * @param {boolean} hasImportedItems - Whether cart has imported items
 * @returns {number} Estimated days
 */
const getEstimatedDays = (zone, hasImportedItems) => {
  if (hasImportedItems) {
    return 12; // Imported items take 10+ days
  }

  const daysByZone = {
    local: 2,
    regional: 4,
    national: 6,
    remote: 8
  };

  return daysByZone[zone] || 5;
};

/**
 * Calculate sales tax
 * @param {string} state - Two-letter state code
 * @param {number} subtotal - Amount to calculate tax on
 * @returns {number} Tax amount
 */
const calculateTax = (state, subtotal) => {
  const taxRate = STATE_TAX_RATES[state] || STATE_TAX_RATES.DEFAULT;
  return parseFloat((subtotal * taxRate).toFixed(2));
};

/**
 * Calculate order total with tax and shipping
 * @param {number} subtotal - Cart subtotal
 * @param {number} shippingCost - Shipping cost
 * @param {number} taxAmount - Tax amount
 * @returns {number} Total amount
 */
const calculateTotal = (subtotal, shippingCost, taxAmount) => {
  return parseFloat((subtotal + shippingCost + taxAmount).toFixed(2));
};

/**
 * Get complete order calculation
 * @param {string} state - Two-letter state code
 * @param {number} subtotal - Cart subtotal
 * @param {number} itemCount - Number of items
 * @param {boolean} hasImportedItems - Has imported items
 * @returns {object} Complete calculation
 */
const calculateOrderTotal = (state, subtotal, itemCount, hasImportedItems = false) => {
  const shipping = calculateShipping(state, subtotal, itemCount, hasImportedItems);
  const tax = calculateTax(state, subtotal);
  const total = calculateTotal(subtotal, shipping.cost, tax);

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    shipping,
    tax: {
      rate: STATE_TAX_RATES[state] || STATE_TAX_RATES.DEFAULT,
      amount: tax
    },
    total,
    currency: 'USD'
  };
};

module.exports = {
  calculateShipping,
  calculateTax,
  calculateTotal,
  calculateOrderTotal,
  getEstimatedDays
};
