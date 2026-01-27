export const generateMockSources = () => {
  const resolutions = ['2160p 4K', '1080p', '720p', '480p'];
  const codecs = ['HEVC x265', 'AVC x264', 'AV1'];
  const hdrs = ['HDR10+', 'Dolby Vision', 'HDR', null, null];
  const providers = ['YTS', 'RARBG', '1337x', 'TorrentGalaxy', 'EZTV'];
  const sizes = ['2.1 GB', '4.5 GB', '8.2 GB', '15.6 GB', '1.2 GB', '850 MB'];

  return Array.from({ length: 6 }, (_, i) => ({
    id: `source-${i}`,
    resolution: resolutions[i % resolutions.length],
    codec: codecs[i % codecs.length],
    hdr: hdrs[i % hdrs.length],
    seeders: Math.floor(Math.random() * 500) + 50,
    size: sizes[i % sizes.length],
    releaseName: `Movie.2024.${resolutions[i % resolutions.length]}.${codecs[i % codecs.length]}.BluRay-RELEASE`,
    provider: providers[i % providers.length],
  })).sort((a, b) => b.seeders - a.seeders);
};
