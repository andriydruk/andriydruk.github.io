#!/bin/sh

# Rebuild website
hugo

# Clean S3 bucket
aws s3 rm s3://andriydruk.com --recursive

# Upload public folder
aws s3 sync ./public s3://andriydruk.com --delete

# Create invalidation for CloudFront
aws cloudfront create-invalidation --distribution-id E1SJSMZPSOIZNF --path "/*"