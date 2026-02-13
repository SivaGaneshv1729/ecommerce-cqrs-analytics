const Joi = require('joi');

const productSchema = Joi.object({
  name: Joi.string().required(),
  category: Joi.string().required(),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).required()
});

const orderSchema = Joi.object({
  customerId: Joi.number().integer().positive().required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.number().integer().positive().required(),
      quantity: Joi.number().integer().positive().required(),
      price: Joi.number().positive().precision(2).required()
    })
  ).min(1).required()
});

module.exports = {
  productSchema,
  orderSchema
};
