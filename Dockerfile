# Use an official lightweight Python image
FROM python:3.10-slim

# Set environment variables to optimize Python execution in containers
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Establish working directory inside the container
WORKDIR /app

# Copy the requirements file and install dependencies directly
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application assets and codes
COPY . /app/

# Expose the Flask development server port
EXPOSE 5000

# Execute the Flask backend on startup
CMD ["python", "app.py"]
