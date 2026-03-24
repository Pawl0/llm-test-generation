import express from 'express';
import { router as usersRouter } from './routes/users';
import { router as productsRouter } from './routes/products';
import { router as ordersRouter } from './routes/orders';
import { router as authRouter } from './routes/auth';

const app = express();

app.use(express.json());
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);
app.use('/auth', authRouter);

export default app;
