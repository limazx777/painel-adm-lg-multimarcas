// Se já estiver logado, vai direto para o index
if (sessionStorage.getItem('token')) {
    window.location.href = 'index.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.textContent = '';

    // Validação local sem necessidade de servidor
    if (username === 'gustavo' && password === 'gustalg2026') {
        // Simula o salvamento de um token para permitir o acesso ao index.html
        sessionStorage.setItem('token', 'acesso-local-autorizado');
        sessionStorage.setItem('role', 'admin');
        window.location.href = 'index.html';
    } else {
        errorDiv.textContent = 'Usuário ou senha incorretos';
    }
});