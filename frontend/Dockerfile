FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --prefer-offline

COPY . .

ENV NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
EXPOSE 3000

CMD ["npm", "run", "dev"]
