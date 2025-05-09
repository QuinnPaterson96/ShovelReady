# Use the official Python image as base
FROM public.ecr.aws/docker/library/python:3.11


# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_HOME=/app

# Create working directory
WORKDIR $APP_HOME

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the FastAPI app into the container
COPY . .

# Expose port 8000 (FastAPI default)
EXPOSE 8000

# Start FastAPI with Uvicorn when the container starts
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
HEALTHCHECK CMD curl --fail http://localhost:8000/health || exit 1
