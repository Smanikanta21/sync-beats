import express from 'express';
import authRouter from './routes/auth.js';
import cors from 'cors';
import dotenv from 'dotenv'; 

dotenv.config();

const app = express();
app.use(cors({
  origin: ["https://www.syncbeats.app", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE","OPTIONS"],
  credentials: true,
}));

app.options("*", cors());
app.use(express.json());
app.use("https://www.syncbeats.app/auth", authRouter);

app.get('/', (req, res) => {
  res.send('Auth is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
