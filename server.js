const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const SECRET_KEY = 'sua_chave_secreta_aqui';
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração do Multer para Upload de Imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Mock de banco de dados
let products = [
    { id: 1, name: 'Camisa Oversized', price: 89.90, stock: 50, category: 'Roupas', description: 'Algodão 100%', image: '' },
    { id: 2, name: 'Pod System X', price: 150.00, stock: 20, category: 'Pods', description: 'Bateria 1000mAh', image: '' }
];

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Rota de Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // Em produção, valide no banco de dados
    if (username === 'gustavo' && password === 'gustalg2026') {
        const token = jwt.sign({ username, role: 'admin' }, SECRET_KEY);
        return res.json({ token, role: 'admin' });
    }
    res.status(401).json({ message: 'Credenciais inválidas' });
});

// CRUD de Produtos
app.get('/api/products', authenticateToken, (req, res) => {
    res.json(products);
});

app.post('/api/products', authenticateToken, upload.single('image'), (req, res) => {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const newProduct = { id: Date.now(), ...req.body, image: imageUrl };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    products = products.map(p => {
        if (p.id == id) {
            return { ...p, ...req.body, image: imageUrl || p.image };
        }
        return p;
    });
    res.json({ message: 'Produto atualizado' });
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    products = products.filter(p => p.id != id);
    res.json({ message: 'Produto excluído' });
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));