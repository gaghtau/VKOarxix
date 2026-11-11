"""Анализ ритма BGM строго по references/music-beat-sync.md §1–§3 (librosa).
Запуск: python scripts/beat-librosa.py <bgm.mp3|wav> analysis [путь_к_librosa]"""
import sys, json
if len(sys.argv) > 3: sys.path.insert(0, sys.argv[3])
import numpy as np, librosa
from scipy.signal import butter, sosfilt

src, out = sys.argv[1], sys.argv[2]
y, sr = librosa.load(src, sr=None, mono=True)
_, perc = librosa.effects.hpss(y)  # ударная составляющая (§6)
tempo, beats = librosa.beat.beat_track(y=perc, sr=sr, tightness=400, units='time')

def fit(bts):
    i = np.arange(len(bts)); A = np.vstack([i, np.ones_like(i)]).T
    (T, t0), *_ = np.linalg.lstsq(A, bts, rcond=None)
    return float(T), float(t0), (bts - (t0 + i * T))

T, t0, res = fit(beats)
onset_env = librosa.onset.onset_strength(y=perc, sr=sr)
onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units='time', backtrack=False)

def score(T, t0):
    n = np.arange(int((len(y) / sr - t0) / T))
    grid = t0 + n * T
    d = onsets[np.argmin(np.abs(onsets[None, :] - grid[:, None]), axis=1)] - grid
    ok = np.abs(d) < 0.035
    drift = np.polyfit(grid[ok], d[ok], 1)[0] * (grid[-1] - grid[0]) * 1000 if ok.sum() > 3 else None
    return {'T': T, 't0': t0, 'bpm': 60 / T, 'match': float(ok.mean()), 'mean_abs_ms': float(np.abs(d[ok]).mean() * 1000), 'drift_ms_total': drift, 'first_beat_ms': float(d[0] * 1000)}

cands = {'0.5x': score(T * 2, t0), '1x': score(T, t0), '2x': score(T / 2, t0)}
win = '1x' if cands['1x']['match'] >= max(cands['0.5x']['match'], cands['2x']['match']) - 0.02 else max(cands, key=lambda k: cands[k]['match'])

def band_env(lo, hi):
    sos = butter(4, [lo, hi], btype='band', fs=sr, output='sos')
    e = librosa.onset.onset_strength(y=sosfilt(sos, perc), sr=sr); return e, librosa.times_like(e, sr=sr)
kick, kt = band_env(40, 160)
G = cands[win]; nb = int((len(y) / sr - G['t0']) / G['T'])
bt = [G['t0'] + k * G['T'] for k in range(nb)]
hits = sorted([{'beat': k, 't': t, 'k': 'kick', 's': float(kick[np.argmin(np.abs(kt - t))])} for k, t in enumerate(bt)], key=lambda h: -h['s'])
rms = librosa.feature.rms(y=y)[0]; rt = librosa.times_like(rms, sr=sr)
rms_beat = [float(rms[(rt >= t) & (rt < t + G['T'])].mean()) for t in bt]
json.dump({'source': src, 'bpm': G['bpm'], 't0': G['t0'], 'T': G['T'], 'beats': bt, 'hits': hits[:24], 'rms_per_beat': rms_beat,
           'beat_track_tempo': float(np.atleast_1d(tempo)[0]), 'fit_residual_ms': float(np.abs(res).max() * 1000), 'method': 'librosa hpss + beat_track + lstsq grid (music-beat-sync §1–3)'},
          open(f'{out}/beat_data.json', 'w'), indent=1)
json.dump({'candidates': cands, 'winner': win}, open(f'{out}/grid_drift.json', 'w'), indent=1)
for k, v in cands.items(): print(k, {a: round(b, 4) if isinstance(b, float) else b for a, b in v.items()})
print('WIN', win, 'residual max %.1f ms' % (np.abs(res).max() * 1000), 'beat_track tempo', np.atleast_1d(tempo)[0])
print('top kicks', [(h['beat'], round(h['s'], 1)) for h in hits[:12]])
