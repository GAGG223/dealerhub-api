import { Router } from 'express';
import { asyncHandler } from './shared/utils/http';
import authRoutes from './modules/auth/auth.routes';
import dealershipRoutes from './modules/dealerships/dealerships.routes';
import userRoutes from './modules/users/users.routes';
import vehicleRoutes from './modules/vehicles/vehicles.routes';
import customerRoutes from './modules/customers/customers.routes';
import leadRoutes from './modules/leads/leads.routes';
import proposalRoutes from './modules/proposals/proposals.routes';
import saleRoutes from './modules/sales/sales.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportRoutes from './modules/reports/reports.routes';
import auditRoutes from './modules/audit/audit.routes';
import { health } from './modules/health/health.controller';

/**
 * Roteador raiz da API versionada (/api/v1).
 * Cada módulo registra suas rotas aqui. Novos módulos são adicionados
 * conforme implementados nas próximas etapas.
 */
const router = Router();

router.get('/health', asyncHandler(health));
router.use('/auth', authRoutes);
router.use('/dealerships', dealershipRoutes);
router.use('/users', userRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/customers', customerRoutes);
router.use('/leads', leadRoutes);
router.use('/proposals', proposalRoutes);
router.use('/sales', saleRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
