const { productSchema, orderSchema } = require('../src/validation');

describe('Validation Schemas', () => {
  describe('Product Schema', () => {
    test('should validate a correct product', () => {
      const validProduct = {
        name: 'Test Product',
        category: 'Test Category',
        price: 100.50,
        stock: 10
      };
      const { error } = productSchema.validate(validProduct);
      expect(error).toBeUndefined();
    });

    test('should reject missing fields', () => {
      const invalidProduct = {
        name: 'Test Product',
        // missing category
        price: 100.50,
        stock: 10
      };
      const { error } = productSchema.validate(invalidProduct);
      expect(error).toBeDefined();
    });

    test('should reject negative price', () => {
      const invalidProduct = {
        name: 'Test Product',
        category: 'Test Category',
        price: -10,
        stock: 10
      };
      const { error } = productSchema.validate(invalidProduct);
      expect(error).toBeDefined();
    });
  });

  describe('Order Schema', () => {
    test('should validate a correct order', () => {
      const validOrder = {
        customerId: 1,
        items: [
          { productId: 1, quantity: 2, price: 50.00 }
        ]
      };
      const { error } = orderSchema.validate(validOrder);
      expect(error).toBeUndefined();
    });

    test('should reject empty items array', () => {
      const invalidOrder = {
        customerId: 1,
        items: []
      };
      const { error } = orderSchema.validate(invalidOrder);
      expect(error).toBeDefined();
    });
  });
});
