/**
 * Provider Registry
 *
 * Central registry for AI providers.
 * - Supports dynamic registration of new provider factories
 * - Manages provider lifecycle (create, configure, dispose)
 * - Provides access to all active providers
 */

import * as vscode from "vscode";
import type { AIProvider, ProviderFactory } from "../types";
import { MinimaxProvider } from "./minimax";
import { ZhipuProvider } from "./zhipu";

export class ProviderRegistry {
  /** Registered provider factories (id -> factory) */
  private factories = new Map<string, ProviderFactory>();

  /** Active provider instances (id -> instance) */
  private instances = new Map<string, AIProvider>();

  constructor(private readonly context: vscode.ExtensionContext) {
    // Register built-in providers
    this.registerFactory("minimax", (ctx) => new MinimaxProvider(ctx));
    this.registerFactory("zhipu", (ctx) => new ZhipuProvider(ctx));
  }

  /**
   * Register a new provider factory.
   * This enables third-party extension to add new providers.
   */
  registerFactory(id: string, factory: ProviderFactory): void {
    this.factories.set(id, factory);
  }

  /**
   * Get or create an instance of a provider by ID.
   */
  getProvider(id: string): AIProvider | undefined {
    // Return existing instance
    if (this.instances.has(id)) {
      return this.instances.get(id);
    }

    // Create new instance from factory
    const factory = this.factories.get(id);
    if (!factory) return undefined;

    const instance = factory(this.context);
    this.instances.set(id, instance);
    return instance;
  }

  /**
   * Get all registered provider IDs.
   */
  getRegisteredIds(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get all providers that are currently enabled and configured.
   */
  getActiveProviders(): AIProvider[] {
    const active: AIProvider[] = [];

    for (const id of this.factories.keys()) {
      const config = vscode.workspace.getConfiguration(`aiUsageStatus.${id}`);
      const enabled = config.get<boolean>("enabled", false);

      if (enabled) {
        const provider = this.getProvider(id);
        if (provider && provider.isConfigured()) {
          active.push(provider);
        }
      }
    }

    return active;
  }

  /**
   * Get all provider instances (including non-active) for configuration UI.
   */
  getAllProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    for (const id of this.factories.keys()) {
      const provider = this.getProvider(id);
      if (provider) {
        providers.push(provider);
      }
    }
    return providers;
  }

  /**
   * Reload configuration for all providers.
   */
  refreshAll(): void {
    for (const provider of this.instances.values()) {
      provider.loadConfig();
    }
  }

  /**
   * Dispose all provider instances.
   */
  dispose(): void {
    for (const provider of this.instances.values()) {
      provider.dispose();
    }
    this.instances.clear();
  }
}
