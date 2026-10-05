import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function github(path) {
  const response = await fetch('https://api.github.com/' + path, {
    headers: {
      accept: 'application/vnd.github+json',
      ...(process.env.GH_READ_TOKEN
        ? { authorization: `Bearer ${process.env.GH_READ_TOKEN}` }
        : {}),
    },
  });
  if (!response.ok)
    throw new Error(`Official release metadata unavailable: HTTP ${response.status}`);
  return response.json();
}
function cooled(date) {
  if (!date || !Number.isFinite(Date.parse(date)) || Date.now() - Date.parse(date) < 4320 * 60000)
    throw new Error('Missing/young official release timestamp');
}
export async function controllerReleases(target) {
  const pins = new Set();
  for (const file of await readdir(join(target, '.github/workflows'))) {
    const text = await readFile(join(target, '.github/workflows', file), 'utf8');
    for (const match of text.matchAll(
      /uses:\s*actions\/checkout@([a-f0-9]{40})\s*#\s*(v\d+\.\d+\.\d+)/g,
    ))
      pins.add(JSON.stringify({ sha: match[1], version: match[2] }));
  }
  if (pins.size !== 1) throw new Error('Actions must use one explicitly released checkout version');
  const pin = JSON.parse([...pins][0]);
  const release = await github(`repos/actions/checkout/releases/tags/${pin.version}`);
  if (release.draft || release.prerelease) throw new Error('Unstable action release');
  cooled(release.published_at);
  const ref = await github(`repos/actions/checkout/git/ref/tags/${pin.version}`);
  const sha =
    ref.object.type === 'tag'
      ? (await github(`repos/actions/checkout/git/tags/${ref.object.sha}`)).object.sha
      : ref.object.sha;
  if (pin.sha !== sha) throw new Error('Action SHA is not the official release tag');
  const images = JSON.parse(await readFile(join(target, 'maintenance/images.json'), 'utf8'));
  const image = /^ghcr\.io\/renovatebot\/renovate:(\d+\.\d+\.\d+)@sha256:([a-f0-9]{64})$/.exec(
    images.renovate,
  );
  if (!image) throw new Error('Image version/digest required');
  const imageRelease = await github(`repos/renovatebot/renovate/releases/tags/${image[1]}`);
  if (imageRelease.draft || imageRelease.prerelease) throw new Error('Unstable image release');
  cooled(imageRelease.published_at);
  const tokenResponse = await fetch(
    'https://ghcr.io/token?service=ghcr.io&scope=repository:renovatebot/renovate:pull',
  );
  if (!tokenResponse.ok) throw new Error('Public image token unavailable');
  const token = (await tokenResponse.json()).token;
  const manifest = await fetch(`https://ghcr.io/v2/renovatebot/renovate/manifests/${image[1]}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept:
        'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json',
    },
  });
  if (!manifest.ok || manifest.headers.get('docker-content-digest') !== `sha256:${image[2]}`)
    throw new Error('Image digest does not match official version');
  return {
    actions: { checkout: { ...pin, publishedAt: release.published_at, source: release.html_url } },
    imageRelease: {
      version: image[1],
      publishedAt: imageRelease.published_at,
      source: imageRelease.html_url,
    },
  };
}
