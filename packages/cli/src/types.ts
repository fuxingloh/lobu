export interface PeerbotConfig {
  worker: WorkerConfig;
  gateway: GatewayConfig;
  credentials: CredentialsConfig;
  targets?: TargetsConfig;
}

export interface WorkerConfig {
  customization: "base" | "dockerfile" | "image";
  baseImage: string;
  customImage?: string;
  resources: ResourceConfig;
  environment?: Record<string, string>;
  volumes?: VolumeMount[];
  storage?: StorageConfig;
  scaling?: ScalingConfig;
}

export interface ResourceConfig {
  cpu: string;
  memory: string;
}

export interface VolumeMount {
  host: string;
  container: string;
  readOnly?: boolean;
}

export interface StorageConfig {
  workspace?: {
    type: "persistent" | "ephemeral";
    size?: string;
  };
}

export interface ScalingConfig {
  max?: number;
  idleTimeout?: string;
}

export interface GatewayConfig {
  port: number;
  publicUrl?: string;
}

export interface CredentialsConfig {
  slack: {
    botToken: string;
    appToken: string;
  };
  anthropic: {
    apiKey: string;
  };
}

export interface TargetsConfig {
  docker?: DockerTargetConfig;
  kubernetes?: KubernetesTargetConfig;
  ecs?: ECSTargetConfig;
  cloudflare?: CloudflareTargetConfig;
}

export interface DockerTargetConfig {
  network?: string;
  compose?: {
    projectName?: string;
  };
}

export interface KubernetesTargetConfig {
  namespace?: string;
  registry?: string;
  repository?: string;
  releaseName?: string;
  runtimeClassName?: string;
  serviceAccount?: string;
  persistentVolume?: {
    storageClass?: string;
    size?: string;
  };
  ingress?: {
    enabled?: boolean;
    className?: string;
    host?: string;
  };
}

export interface ECSTargetConfig {
  cluster?: string;
  taskExecutionRole?: string;
  taskRole?: string;
  networkMode?: string;
  subnets?: string[];
  securityGroups?: string[];
  launchType?: "FARGATE" | "EC2";
  cpu?: string;
  memory?: string;
  ecrRepository?: string;
}

export interface CloudflareTargetConfig {
  accountId?: string;
  maxInstances?: number;
  storage?: {
    workspace?: {
      bucket?: string;
    };
  };
  routing?: "stateful" | "random";
}

export type DeploymentTarget = "docker" | "kubernetes" | "ecs" | "cloudflare";

export interface InitOptions {
  target: DeploymentTarget;
  projectName: string;
  customize: boolean;
}

export interface DeployOptions {
  target?: DeploymentTarget;
  values?: string;
}
