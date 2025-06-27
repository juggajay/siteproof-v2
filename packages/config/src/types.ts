export type AppConfig = {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
};

export type ApiRoute = string;