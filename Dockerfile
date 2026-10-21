# Use an official Node.js runtime as the base image
FROM node:20-alpine

# Add gcc and cmake
RUN apk add --no-cache build-base cmake ninja git ca-certificates \
    && sed -i 's|^mozilla/emSign_ECC_Root_CA_-_G3\.crt$|!&|' /etc/ca-certificates.conf \
    && grep -q '^!mozilla/emSign_ECC_Root_CA_-_G3\.crt$' /etc/ca-certificates.conf \
    && update-ca-certificates

# Use the system trust store with the compromised eMudhra chain removed.
ENV NODE_OPTIONS=--use-openssl-ca \
    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json into the directory /app in the container
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Install the project
RUN npm run build

# Make port 3000 available to the outside world
EXPOSE 3000

# Define the command to run the application
CMD [ "npm", "run", "run" ]
