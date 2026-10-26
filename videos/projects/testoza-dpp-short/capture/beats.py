# Beats, downbeat-ish onsets and a 1 s RMS energy curve for a music bed. python beats.py file.mp3
import sys, numpy as np, librosa
y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
bt = librosa.frames_to_time(beats, sr=sr)
print('duration %.2f tempo %s beats %d' % (len(y) / sr, np.round(tempo, 1), len(bt)))
print('first beats', np.round(bt[:8], 2))
r = librosa.feature.rms(y=y, hop_length=512)[0]
sec = int(len(y) / sr)
rms = np.array([r[int(i * sr / 512):int((i + 1) * sr / 512)].mean() for i in range(sec)])
print('rms/s', ' '.join('%d:%.0f' % (i, 100 * r / rms.max()) for i, r in enumerate(rms)))
on = librosa.onset.onset_strength(y=y, sr=sr)
peaks = librosa.util.peak_pick(on, pre_max=20, post_max=20, pre_avg=40, post_avg=40, delta=on.max() * 0.35, wait=40)
print('strong hits', ' '.join('%.2f' % t for t in librosa.frames_to_time(peaks, sr=sr)))
