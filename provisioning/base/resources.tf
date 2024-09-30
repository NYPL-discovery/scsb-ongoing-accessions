provider "aws" {
  region     = "us-east-1"
}

variable "environment" {
  type = string
  default = "qa"
  description = "The name of the environnment (qa, production). This controls the name of lambda and the env vars loaded."

  validation {
    condition     = contains(["qa", "production"], var.environment)
    error_message = "The environment must be 'qa' or 'production'."
  }
}

# Package the app as a zip:
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/dist.zip"
  source_dir  = "../../"
  excludes    = [".git", ".terraform", "provisioning"]
}

# Upload the zipped app to S3:
resource "aws_s3_bucket_object" "uploaded_zip" {
  bucket = "nypl-github-actions-builds-${var.environment}"
  key    = "scsb-ongoing-accessions-${var.environment}-dist.zip"
  acl    = "private"
  source = data.archive_file.lambda_zip.output_path
  etag   = filemd5(data.archive_file.lambda_zip.output_path)
}

# Create the lambda:
resource "aws_lambda_function" "lambda_instance" {
  description   = "Serves the `/api/v0.1/recap/nypl-bibs` endpoint"
  function_name = "ScsbOngoingAccessions-${var.environment}"
  handler       = "index.handler"
  memory_size   = 128
  role          = "arn:aws:iam::946183545209:role/lambda-full-access"
  runtime       = "nodejs20.x"
  timeout       = 60

  # Location of the zipped code in S3:
  s3_bucket     = aws_s3_bucket_object.uploaded_zip.bucket
  s3_key        = aws_s3_bucket_object.uploaded_zip.key

  # Trigger pulling code from S3 when the zip has changed:
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256


  tags = {
    Environment = var.environment
    Project= "LSP"
  }

  # Load ENV vars from ./config/{environment}.env
  environment {
    variables = { for tuple in regexall("(.*?)=(.*)", file("../../config/${var.environment}.env")) : tuple[0] => tuple[1] }
  }
}
