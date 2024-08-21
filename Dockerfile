# Use an official Node.js runtime as the base image
FROM node:20-alpine

# Add gcc and cmake
RUN apk add build-base cmake ninja git

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
