import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';

dotenv.config();
const app = express();

app.use(express.json())
app.use("/auth",authRouter)

app.get('/',(res,req)=>{
    res.send('Auth is running')
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
export default app;