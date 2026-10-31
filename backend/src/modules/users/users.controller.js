import * as usersService from './users.service.js';

export async function list(req, res, next) {
  try {
    const query = req.validatedQuery || req.query;
    const result = await usersService.listUsers(query);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

export async function createStaff(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const staff = await usersService.createStaff(req.body, req.user.id, ipAddress, userAgent);
    res.status(201).json({
      success: true,
      data: staff
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const updated = await usersService.updateUser(req.params.id, req.body, req.user.id, ipAddress, userAgent);
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
    const result = await usersService.deleteUser(req.params.id, req.user.id, ipAddress, userAgent);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
