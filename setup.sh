#!/bin/bash

# Verifica se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js não está instalado. Por favor, instale Node.js v16+ primeiro."
    exit 1
fi

# Verifica a versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "Versão do Node.js ($(node -v)) é muito antiga. Por favor, atualize para Node.js v16+."
    exit 1
fi

# Verifica se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "npm não está instalado. Por favor, instale o npm."
    exit 1
fi

# Diretório do projeto
PROJECT_DIR=$(pwd)
echo "Configurando projeto em: $PROJECT_DIR"

# Instalação das dependências
echo "Instalando dependências..."
npm install --save \
    express \
    mongoose \
    cors \
    dotenv \
    bcryptjs \
    jsonwebtoken \
    validator \
    axios \
    googleapis \
    ws

# Dependências de desenvolvimento (opcional)
echo "Instalando dependências de desenvolvimento..."
npm install --save-dev \
    nodemon \
    eslint \
    prettier

# Verificação das versões instaladas
echo ""
echo "Versões instaladas:"
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"
echo ""
echo "Dependências:"
npm list --depth=0

# Configuração do ambiente
if [ ! -f ".env" ]; then
    echo "Criando arquivo .env..."
    cat > .env <<EOL
# Configurações básicas
PORT=3000
MONGODB_URI=mongodb+srv://joaofranciscovicapaulo55:bX5H8VhNJRAaHBnT@jpainel.su2lugr.mongodb.net/Jpainel?retryWrites=true&w=majority
JWT_SECRET=seu_segredo_super_secreto
JWT_EXPIRES_IN=1h

# Configurações do Google
GOOGLE_CLIENT_ID=508476729515-0649g34rbg5hl3j3fdb6ttlnd7ogvhol.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=sua_client_secret_aqui  # Você precisará obter isso no console do Google Cloud
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_API_KEY=sua_api_key

# Configurações de monitoramento
UPTIME_CHECK_INTERVAL=300000 # 5 minutos em milissegundos
EOL
    echo ""
    echo "Arquivo .env criado com as seguintes configurações:"
    echo "- MongoDB URI configurado com o banco Jpainel"
    echo "- Google Client ID configurado"
    echo ""
    echo "ATENÇÃO: Você precisa:"
    echo "1. Obter o Google Client Secret no console do Google Cloud"
    echo "2. Substituir 'sua_client_secret_aqui' no arquivo .env"
    echo "3. Configurar a GOOGLE_API_KEY se necessário"
fi

echo ""
echo "Setup concluído com sucesso!"
echo "Execute o servidor com: npm start"
