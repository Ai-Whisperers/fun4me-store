# 🚀 Despliegue en GCP (Google Cloud Platform)

Vete se despliega en una VM de GCP usando GitHub Actions.

## Producción

- **URL:** http://34.151.201.27:3000
- **VM:** vete-prod (e2-medium)
- **Región:** southamerica-east1 (São Paulo)
- **OS:** Ubuntu 22.04 LTS

## Despliegue Automático

Cada push a `main` activa el workflow de GitHub Actions que:

1. Ejecuta tests
2. Se conecta a la VM via SSH
3. Hace pull del código
4. Instala dependencias
5. Hace build
6. Reinicia con PM2

## Configuración Inicial (una vez)

### 1. En la VM de GCP

```bash
# Instalar Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Clonar el repo
cd /home/ai-whisperers
git clone https://github.com/Ai-Whisperers/Vete.git
cd Vete/web

# Configurar .env.local
cp .env.example .env.local
# Editar con las credenciales de producción

# Build inicial
npm ci --legacy-peer-deps
npm run build

# Iniciar con PM2
pm2 start npm --name vete-web -- start
pm2 startup
pm2 save
```

### 2. En GitHub

Agregar secret `GCP_SSH_PRIVATE_KEY` con la clave privada SSH:

```bash
# Generar par de claves (si no existe)
ssh-keygen -t ed25519 -C "github-actions@vete"

# Agregar clave pública a la VM
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys

# Copiar clave privada para GitHub Secrets
cat ~/.ssh/id_ed25519
```

Ir a: Repo → Settings → Secrets → Actions → New repository secret

## Despliegue Manual

```bash
# Conectar a la VM
ssh ai-whisperers@34.151.201.27

# Ir al directorio
cd /home/ai-whisperers/Vete/web

# Pull, build, restart
git pull origin main
npm ci --legacy-peer-deps
npm run build
pm2 restart vete-web
```

## Monitoreo

```bash
# Ver logs
pm2 logs vete-web

# Estado
pm2 status

# Monitoreo en tiempo real
pm2 monit
```

## Dominios (próximamente)

Para configurar un dominio custom:

1. Configurar DNS A record apuntando a 34.151.201.27
2. Instalar Nginx como reverse proxy
3. Configurar SSL con Let's Encrypt

```bash
# Instalar Nginx y Certbot
sudo apt install nginx certbot python3-certbot-nginx

# Configurar sitio (ejemplo: vete.ai-whisperers.com)
sudo nano /etc/nginx/sites-available/vete
```

## Troubleshooting

### App no inicia
```bash
pm2 logs vete-web --lines 50
```

### Puerto 3000 ocupado
```bash
sudo lsof -i :3000
pm2 delete all
pm2 start npm --name vete-web -- start
```

### Error de build
```bash
rm -rf .next node_modules
npm ci --legacy-peer-deps
npm run build
```
