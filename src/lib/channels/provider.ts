export interface ChannelProvider<TFeedContext = unknown> {
  key: string;
  buildFeeds(context: TFeedContext): Promise<Record<string, string>> | Record<string, string>;
}

const providers = new Map<string, ChannelProvider>();

export function registerChannelProvider(provider: ChannelProvider) {
  providers.set(provider.key, provider);
}

export function getChannelProvider<TFeedContext = unknown>(key: string) {
  return providers.get(key) as ChannelProvider<TFeedContext> | undefined;
}
