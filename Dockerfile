# Use an official Node.js runtime as the base image (last node LTS version running on Alpine)
FROM node:24.4.1-alpine

# Set the working directory in the Docker container
WORKDIR /app

# Install git
RUN apk add --no-cache git

# For now copy (cloned repo) code contents to workdir
COPY . /app/

# Install dependencies
RUN npm install

# Build the static version
RUN npm run build --adapter=static

# Serve the static files with a lightweight server (like serve)
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 5000

# Command to run the app
CMD ["serve", "-s", "build", "-l", "5000"]
