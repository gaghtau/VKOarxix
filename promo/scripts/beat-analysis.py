"""Анализ ритма BGM по методике references/music-beat-sync.md (video-shotcraft).

librosa в системе нет, поэтому те же шаги сделаны на numpy/scipy:
  1) огибающая атак (спектральный поток) по полосам: kick 40–160 Гц, snare 150–500 + 1–3 кГц, hihat 6–14 кГц;
  2) кандидаты темпа по автокорреляции kick-огибающей, сетка t_i = t0 + i*T уточняется МНК
     по реальным атакам рядом с узлами сетки;
  3) проверка кандидатов 0.5x/1x/2x: match (доля узлов с атакой в ±35 мс), mean_abs_ms, drift;
  4) RMS-кривая по долям → структура (где энергия набирается), топ kick-ударов.
Вход: WAV mono. Выход: analysis/beat_data.json, analysis/grid_drift.json.
Все времена — секунды float, без округления до кадров.
"""
import json, sys, wave
import numpy as np
from scipy.signal import butter, sosfiltfilt, find_peaks

src, outdir = sys.argv[1], sys.argv[2]
w = wave.open(src)
sr = w.getframerate()
y = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768.0
HOP = 256
hop_t = HOP / sr

def band_env(lo, hi):
    sos = butter(4, [lo, min(hi, sr / 2 - 100)], btype='band', fs=sr, output='sos')
    x = sosfiltfilt(sos, y)
    frames = len(x) // HOP
    e = np.sqrt(np.add.reduceat(x[: frames * HOP] ** 2, np.arange(0, frames * HOP, HOP)) / HOP)
    le = np.log1p(1000 * e)
    flux = np.maximum(0, np.diff(le, prepend=le[0]))  # рост энергии = атака
    return flux / (flux.max() + 1e-9)

kick = band_env(40, 160)
snare = 0.5 * band_env(150, 500) + 0.5 * band_env(1000, 3000)
hihat = band_env(6000, 10500)
times = np.arange(len(kick)) * hop_t

# --- темп: автокорреляция kick-огибающей в диапазоне 70–180 BPM
ac = np.correlate(kick - kick.mean(), kick - kick.mean(), mode='full')[len(kick) - 1:]
lags = np.arange(len(ac)) * hop_t
mask = (lags > 60 / 180) & (lags < 60 / 70)
T0 = lags[mask][np.argmax(ac[mask])]

# --- атаки: пики суммарной огибающей (kick + snare) над скользящей медианой (адаптивный порог)
from scipy.ndimage import median_filter
env = kick + 0.6 * snare
base = median_filter(env, size=int(1.0 / hop_t))
pk, _ = find_peaks(env - base, height=0.04, prominence=0.04, distance=int(0.09 / hop_t))
onsets = times[pk]

def fit_grid(T):
    # фаза: перебор и выбор максимальной суммы энергии в узлах, затем МНК по ближайшим атакам
    best = None
    for ph in np.arange(0, T, hop_t):
        n = np.arange(int((times[-1] - ph) / T))
        idx = np.clip(np.round((ph + n * T) / hop_t).astype(int), 0, len(kick) - 1)
        s = kick[idx].sum()
        if best is None or s > best[0]: best = (s, ph)
    t0 = best[1]
    for _ in range(3):
        n = np.arange(int((times[-1] - t0) / T))
        grid = t0 + n * T
        near = onsets[np.argmin(np.abs(onsets[None, :] - grid[:, None]), axis=1)]
        ok = np.abs(near - grid) < 0.035
        if ok.sum() < 8: break
        A = np.vstack([n[ok], np.ones(ok.sum())]).T
        (T, t0), *_ = np.linalg.lstsq(A, near[ok], rcond=None)
    n = np.arange(int((times[-1] - t0) / T))
    grid = t0 + n * T
    near = onsets[np.argmin(np.abs(onsets[None, :] - grid[:, None]), axis=1)]
    err = near - grid
    ok = np.abs(err) < 0.035
    drift = float(np.polyfit(grid[ok], err[ok], 1)[0] * (grid[-1] - grid[0]) * 1000) if ok.sum() > 2 else None
    return {'T': float(T), 't0': float(t0), 'bpm': float(60 / T), 'match': float(ok.mean()),
            'mean_abs_ms': float(np.abs(err[ok]).mean() * 1000) if ok.any() else None,
            'drift_ms_total': drift, 'first_beat_onset_ms': float(err[0] * 1000)}

cands = {k: fit_grid(T0 * f) for k, f in (('0.5x', 2.0), ('1x', 1.0), ('2x', 0.5))}
# 2x почти всегда «совпадает» чаще из-за плотности — сравниваем по match, при равенстве берём более редкую сетку
win = max(cands, key=lambda k: (round(cands[k]['match'], 2), -{'0.5x': 0, '1x': 1, '2x': 2}[k] * 0 + (1 if k == '1x' else 0)))
G = cands[win]
T, t0 = G['T'], G['t0']
nb = int((times[-1] - t0) / T)
beats = [t0 + i * T for i in range(nb)]

def at(env, t):
    i = int(round(t / hop_t)); return float(env[max(0, i - 2): i + 3].max())

# RMS по долям → секции
rms_frame = np.sqrt(np.add.reduceat(y[: (len(y) // HOP) * HOP] ** 2, np.arange(0, (len(y) // HOP) * HOP, HOP)) / HOP)
rms_beats = [float(rms_frame[int(b / hop_t): int((b + T) / hop_t)].mean()) for b in beats]
rmax = max(rms_beats)
rms_db = [20 * np.log10(r / rmax + 1e-9) for r in rms_beats]
hits = [{'beat': i, 't': b, 'k': 'kick', 's': at(kick, b)} for i, b in enumerate(beats)]
snares = [{'beat': i, 't': b, 'k': 'snare', 's': at(snare, b)} for i, b in enumerate(beats)]
hat = [at(hihat, b + T / 2) for b in beats]  # хай-хэт на «и» — плотность микро-движений
# секции по 8 долей: средний RMS в дБ
sections = []
for s in range(0, nb, 8):
    seg = rms_db[s: s + 8]
    sections.append({'from_beat': s, 'to_beat': min(nb, s + 8), 'rms_db': float(np.mean(seg)), 'hat': float(np.mean(hat[s: s + 8]))})

json.dump({'source': src, 'bpm': G['bpm'], 't0': t0, 'T': T, 'beats': beats,
           'hits': sorted(hits, key=lambda h: -h['s'])[:24], 'snares': sorted(snares, key=lambda h: -h['s'])[:24],
           'rms_db_per_beat': rms_db, 'sections': sections, 'method': 'numpy/scipy port of music-beat-sync §1–§3 (librosa unavailable)'},
          open(f'{outdir}/beat_data.json', 'w'), indent=1)
json.dump({'candidates': cands, 'winner': win, 'reason': 'наибольший match в ±35 мс; при равенстве — сетка 1x (kick на целых долях)'},
          open(f'{outdir}/grid_drift.json', 'w'), indent=1)
print(json.dumps({k:{a:(round(b,3) if isinstance(b,float) else b) for a,b in v.items()} for k,v in cands.items()}, indent=1))
print('WIN', win, 'bpm %.3f t0 %.4f T %.5f' % (G['bpm'], t0, T))
for s in sections: print('beats %3d-%3d  rms %6.1f dB  hat %.2f' % (s['from_beat'], s['to_beat'], s['rms_db'], s['hat']))
