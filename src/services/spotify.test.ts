import { describe,expect,it } from 'vitest'
import { spotifyPlaylistUri } from './spotify'

describe('Spotify playlist links',()=>{
  it('converts a shared playlist URL into an App Remote URI',()=>expect(spotifyPlaylistUri('https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO?si=abc')).toBe('spotify:playlist:37i9dQZF1DX4sWSpwq3LiO'))
  it('keeps a valid Spotify playlist URI',()=>expect(spotifyPlaylistUri('spotify:playlist:abc123')).toBe('spotify:playlist:abc123'))
  it('rejects non-playlist links',()=>expect(()=>spotifyPlaylistUri('https://open.spotify.com/track/abc')).toThrow(/playlist link/))
})
