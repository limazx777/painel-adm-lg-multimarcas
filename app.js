import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Inicializa o Firebase usando a config global do firebase-config.js
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let products = [];

// Escuta as mudanças no Firestore em tempo real (Sincroniza a tabela automaticamente)
onSnapshot(collection(db, "products"), (snapshot) => {
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTable();
});

const productTableBody = document.getElementById('productTableBody');
const productForm = document.getElementById('productForm');
const productModal = document.getElementById('productModal');
const btnOpenModal = document.getElementById('btnOpenModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnAddVariant = document.getElementById('btnAddVariant');
const variantsContainer = document.getElementById('variantsContainer');
const searchInput = document.getElementById('searchProduct');
const categorySelect = document.getElementById('productCategory');

// Função para renderizar a tabela
function renderTable(data = products) {
    productTableBody.innerHTML = '';
    data.forEach(product => {
        // Formata a exibição das cores e tamanhos usando a nova estrutura de stocks
        const variantsInfo = product.colors ? product.colors.map(color => {
            const inventory = product.stocks[color] || {};
            const tags = Object.entries(inventory)
                .map(([s, q]) => `<span class="size-badge"><strong>${s}</strong>: ${q}</span>`)
                .join('');
            return `<div class="variant-row-info"><strong>${color}</strong>: ${tags}</div>`;
        }).join('') : '-';
            
        const stockStatus = product.stock <= 0 ? '<span class="stock-out">ESGOTADO</span>' : `${product.stock} un`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${product.image || 'https://via.placeholder.com/40'}" class="product-img"></td>
            <td>
                ${product.name}
                <div class="product-details">${variantsInfo}</div>
            </td>
            <td><span class="badge badge-${(product.category || 'default').toLowerCase()}">${product.category || 'N/A'}</span></td>
            <td>R$ ${parseFloat(product.price || 0).toFixed(2)}</td>
            <td>${stockStatus}</td>
            <td>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editProduct('${product.id}')" class="btn-primary" style="padding: 5px 10px; font-size: 12px; width: auto;">Editar</button>
                    <button onclick="deleteProduct('${product.id}')" class="btn-cancel" style="padding: 5px 10px; font-size: 12px; width: auto;">Excluir</button>
                </div>
            </td>
        `;
        productTableBody.appendChild(row);
    });
}

function createVariantRow(data = null) {
    const div = document.createElement('div');
    div.className = 'variant-item';
    div.innerHTML = `
        <div class="variant-header">
            <input type="text" class="v-color" placeholder="Cor (Ex: Preto)" value="${data ? data.color : ''}" required>
            <button type="button" class="btn-remove-variant">&times;</button>
        </div>
        <div class="checkbox-group">
            ${['PP', 'P', 'M', 'G', 'GG'].map(size => {
                const qty = data && data.inventory[size] ? data.inventory[size] : '';
                const checked = qty !== '' ? 'checked' : '';
                const disabled = qty !== '' ? '' : 'disabled';
                return `
                    <div class="size-row">
                        <label><input type="checkbox" value="${size}" ${checked}> ${size}</label>
                        <input type="number" class="size-qty" placeholder="Qtd" min="0" value="${qty}" ${disabled}>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Eventos internos da linha
    div.querySelector('.btn-remove-variant').onclick = () => {
        div.remove();
        updateTotalStock();
    };

    div.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.onchange = (e) => {
            const qtyInput = e.target.closest('.size-row').querySelector('.size-qty');
            qtyInput.disabled = !e.target.checked;
            if (!e.target.checked) qtyInput.value = '';
            updateTotalStock();
        };
    });

    div.querySelectorAll('.size-qty').forEach(input => {
        input.oninput = updateTotalStock;
    });

    variantsContainer.appendChild(div);
}

function updateTotalStock() {
    const total = Array.from(document.querySelectorAll('.variant-item .size-qty'))
        .reduce((sum, input) => sum + (parseInt(input.value, 10) || 0), 0);
    document.getElementById('productStock').value = total;
}

btnAddVariant.onclick = () => createVariantRow();

// Abrir e fechar modal
btnOpenModal.onclick = () => {
    productForm.reset();
    variantsContainer.innerHTML = '';
    createVariantRow(); // Inicia com uma cor vazia
    document.getElementById('productId').value = '';
    document.getElementById('modalTitle').innerText = 'Adicionar Produto';
    productModal.style.display = 'flex';
    updateTotalStock();
};

btnCloseModal.onclick = () => productModal.style.display = 'none';

// Lógica de Cadastro de Produto
productForm.onsubmit = (e) => {
    e.preventDefault();

    const id = document.getElementById('productId').value;
    const fileInput = document.getElementById('productImage');
    const file = fileInput.files[0];

    const colors = [];
    const stocks = {};

    document.querySelectorAll('.variant-item').forEach(item => {
        const color = item.querySelector('.v-color').value.trim();
        const inventory = {};
        item.querySelectorAll('.size-row').forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            const size = cb.value;
            const qtyValue = row.querySelector('.size-qty').value;

            if (cb.checked) {
                // Garante que a quantidade seja salva como Número
                inventory[size] = Math.max(0, parseInt(qtyValue, 10) || 0);
            }
        });
        
        // Só adiciona a cor se ela tiver um nome e pelo menos um tamanho selecionado
        if (color && Object.keys(inventory).length > 0) {
            colors.push(color);
            // Aqui criamos o Mapa: Cor -> Mapa de Tamanhos
            stocks[color] = inventory;
        }
    });

    if (colors.length === 0) {
        return alert("Adicione pelo menos uma cor e um tamanho com estoque.");
    }

    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value.toUpperCase(),
        colors: colors, // Array com os nomes das cores ["Preto", "Branco"]
        stocks: stocks, // Mapa de Mapas conforme solicitado
        stock: Number(document.getElementById('productStock').value), // Estoque total consolidado
        price: Number(document.getElementById('productPrice').value),
        description: document.getElementById('productDesc').value,
    };

    // Se houver imagem, converte para Base64 para salvar localmente
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            saveProduct(id, { ...productData, image: event.target.result });
        };
        reader.readAsDataURL(file);
    } else if (id) {
        const existingProduct = products.find(p => p.id == id);
        saveProduct(id, { ...productData, image: existingProduct ? existingProduct.image : '' });
    } else {
        saveProduct(null, { ...productData, image: '' });
    }
};

async function saveProduct(id, data) {
    try {
        if (id) {
            // Modo Edição no Firestore
            await updateDoc(doc(db, "products", id), {
                ...data,
                ultimaAtualizacao: serverTimestamp() // Adiciona data de modificação
            });
        } else {
            // Modo Novo Produto: Usando a lógica da sua função solicitada
            await salvarProduto(data);
        }
        productModal.style.display = 'none';
        productForm.reset();
    } catch (error) {
        console.error("Erro ao salvar no Firestore:", error);
        alert("Erro ao salvar o produto no banco de dados.");
    }
}

// A função solicitada adaptada para o seu banco de dados
async function salvarProduto(data) {
    try {
        const docRef = await addDoc(collection(db, "products"), {
            ...data,
            dataCriacao: serverTimestamp() // Usa o timestamp oficial do servidor Firebase
        });
        console.log("Produto salvo com ID: ", docRef.id);
        alert("Peça adicionada com sucesso!");
    } catch (e) {
        console.error("Erro ao adicionar: ", e);
        throw e; // Repassa o erro para o catch principal
    }
}

// Excluir Produto
window.deleteProduct = async (id) => {
    if (confirm('Deseja excluir este produto?')) {
        try {
            await deleteDoc(doc(db, "products", id));
        } catch (error) {
            console.error("Erro ao excluir do Firestore:", error);
        }
    }
};

// Editar Produto
window.editProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('modalTitle').innerText = 'Editar Produto';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    
    variantsContainer.innerHTML = '';
    if (product.colors && product.stocks) {
        product.colors.forEach(color => {
            createVariantRow({ color, inventory: product.stocks[color] });
        });
    } else {
        createVariantRow(); // Fallback
    }

    document.getElementById('productPrice').value = product.price;
    updateTotalStock();
    document.getElementById('productDesc').value = product.description || '';
    
    productModal.style.display = 'flex';
};

// Busca dinâmica
searchInput.oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.category.toLowerCase().includes(term)
    );
    renderTable(filtered);
};