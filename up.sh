cd docker
docker compose -f docker-compose.yml -f docker-compose.without-nginx.yml up -d
cd ..
npm run start
