import { z } from 'zod';

const currentYear = new Date().getFullYear();

const vehicleStatusEnum = z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'MAINTENANCE']);

export const createVehicleSchema = z.object({
  brand: z.string().min(1).max(60),
  model: z.string().min(1).max(80),
  version: z.string().max(80).optional(),
  year: z
    .number()
    .int()
    .min(1900, 'Ano inválido.')
    .max(currentYear + 1, 'Ano inválido.'),
  mileage: z.number().int().min(0).default(0),
  price: z.number().positive('O preço deve ser positivo.'),
  costPrice: z.number().positive().optional(),
  transmission: z.string().max(30).optional(),
  fuel: z.string().max(30).optional(),
  bodyType: z.string().max(30).optional(),
  engine: z.string().max(30).optional(),
  horsepower: z.number().int().positive().optional(),
  color: z.string().max(30).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(120).optional(),
});

// PUT: substituição completa (mesmos campos obrigatórios do create).
export const replaceVehicleSchema = createVehicleSchema;

// PATCH: atualização parcial.
export const updateVehicleSchema = createVehicleSchema.partial();

export const updateStatusSchema = z.object({
  status: vehicleStatusEnum,
});

export const listVehiclesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  sort: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minYear: z.coerce.number().int().optional(),
  maxYear: z.coerce.number().int().optional(),
  minMileage: z.coerce.number().int().nonnegative().optional(),
  maxMileage: z.coerce.number().int().nonnegative().optional(),
  transmission: z.string().optional(),
  fuel: z.string().optional(),
  bodyType: z.string().optional(),
  status: vehicleStatusEnum.optional(),
  search: z.string().optional(),
});

export const createImageSchema = z.object({
  url: z.string().url('URL da imagem inválida.'),
  alt: z.string().max(160).optional(),
  position: z.number().int().min(0).default(0),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

export const imageParamsSchema = z.object({
  id: z.string().uuid('ID inválido.'),
  imageId: z.string().uuid('ID da imagem inválido.'),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
export type CreateImageInput = z.infer<typeof createImageSchema>;
