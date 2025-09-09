terraform {
  backend "s3" {
    bucket = "peerbot-tfstate"
    key    = "hetzner/terraform.tfstate"
    region = "auto"
    endpoint = "https://6acfafe8702c88f6bc71bc5b1e67f654.r2.cloudflarestorage.com"
    skip_credentials_validation = true
    skip_metadata_api_check = true
    skip_region_validation = true
    skip_requesting_account_id = true
    force_path_style = true
  }
}
