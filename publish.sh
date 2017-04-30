#!/bin/sh

# Rebuild website
hugo

# Upload publish to S3
aws s3 sync ./public s3://andriydruk.com --delete

# Create invalidation for CloudFront
aws cloudfront create-invalidation --distribution-id E1SJSMZPSOIZNF --path /