#!/usr/bin/env bun

import type { ChildProcess } from "node:child_process";
import type { Server as HttpServer } from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * MCP resource handler parameters
 */
export interface ResourceParams {
  uri?: string;
  url?: string;
  toString(): string;
}

export interface ProcessInfo {
  id: string;
  command: string;
  description: string;
  status: "starting" | "running" | "completed" | "failed" | "killed";
  pid?: number;
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  process?: ChildProcess;
  port?: number;
  tunnelUrl?: string;
  tunnelProcess?: ChildProcess;
  workingDirectory?: string;
}

export interface ProcessManagerInstance {
  port: number;
  server: McpServer;
  httpServer: HttpServer;
  close: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface ProcessManagerApi {
  startProcess(
    id: string,
    command: string,
    description: string,
    port?: number,
    workingDirectory?: string
  ): Promise<ProcessInfo>;
  stopProcess(id: string): Promise<void>;
  restartProcess(id: string, workingDirectory?: string): Promise<ProcessInfo>;
  getStatus(id?: string): ProcessInfo | ProcessInfo[] | null;
  getLogs(id: string, lines?: number): Promise<string>;
}
