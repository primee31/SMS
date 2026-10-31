import * as customersService from './customers.service.js';

export async function list(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await customersService.listCustomers(query);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const customer = await customersService.createCustomer(req.body, req.user.id, ipAddress, userAgent);
    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const customer = await customersService.getCustomerById(req.params.id);
    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const updated = await customersService.updateCustomer(req.params.id, req.body, req.user.id, ipAddress, userAgent);
    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await customersService.deleteCustomer(req.params.id, req.user.id, ipAddress, userAgent);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
