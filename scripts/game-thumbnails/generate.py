#!/usr/bin/env python3
"""Animated thumbnail GIFs for every Haber game, in the flat illustrated style.

Reads titles and clinical domains from game-catalog-handoff.json and writes, per game key:
  apps/web/public/game-thumbnails/<key>.gif     480x270 (game picker preview)
  apps/web/public/game-thumbnails/<key>-sm.gif  160x160 (game picker list tile)

Needs Pillow:  pip install pillow
Usage:         python3 scripts/game-thumbnails/generate.py [--only <key>] [--sheet <dir>]
"""

import argparse
import json
import math
import random
from functools import lru_cache
from pathlib import Path as FsPath

from PIL import Image, ImageDraw, ImageFont

ROOT = FsPath(__file__).resolve().parents[2]
CATALOG = ROOT / "game-catalog-handoff.json"
OUT = ROOT / "apps/web/public/game-thumbnails"

SS = 2  # supersampling factor
N = 40  # frames per loop
DUR = 75  # ms per frame -> 3 s loop

FORMATS = {
	"wide": {"size": (480, 270), "suffix": "", "title_h": 50, "font": 24, "lines": 1},
	"sm": {"size": (160, 160), "suffix": "-sm", "title_h": 50, "font": 17, "lines": 2},
}

# Background tint and title colour per clinical domain (matches GameThumbnail.tsx).
DOMAIN = {
	"Motor Skills": ("#dbeafe", "#1e40af"),
	"Cognitive Processing": ("#f3e8ff", "#7e22ce"),
	"Attention & Focus": ("#fef3c7", "#b45309"),
	"Memory & Learning": ("#e0e7ff", "#4338ca"),
	"Balance & Coordination": ("#ccfbf1", "#0f766e"),
	"Communication & Language": ("#fce7f3", "#be185d"),
	"Sensory Processing": ("#dcfce7", "#166534"),
	"Emotional Regulation": ("#ffe4e6", "#be123c"),
	"Social Interaction": ("#ffedd5", "#c2410c"),
	"Daily Living Skills": ("#cffafe", "#0e7490"),
}

RAINBOW = ["#ef4444", "#f59e0b", "#facc15", "#10b981", "#3b82f6", "#8b5cf6"]
CONFETTI = ["#f43f5e", "#f59e0b", "#10b981", "#8b5cf6", "#3b82f6", "#ec4899"]
FOOT = "#f43f5e"
TRACE_BLUE = "#2563eb"
GOOD = "#16a34a"


# ---------------------------------------------------------------- helpers
def lerp(a, b, t):
	return a + (b - a) * t


def clamp(x, lo=0.0, hi=1.0):
	return lo if x < lo else hi if x > hi else x


def smooth(t):
	t = clamp(t)
	return t * t * (3 - 2 * t)


def ease_out(t):
	t = clamp(t)
	return 1 - (1 - t) ** 3


def hexc(h):
	h = h.lstrip("#")
	return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def col(c, a=1.0):
	rgb = hexc(c) if isinstance(c, str) else c
	return (*rgb, int(255 * clamp(a)))


def mix(c1, c2, t):
	a, b = hexc(c1) if isinstance(c1, str) else c1, hexc(c2) if isinstance(c2, str) else c2
	return tuple(int(round(lerp(x, y, clamp(t)))) for x, y in zip(a, b))


@lru_cache(maxsize=64)
def font(size):
	for path in (
		"/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf",
		"/System/Library/Fonts/Supplemental/Arial Bold.ttf",
		"/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
	):
		if FsPath(path).exists():
			return ImageFont.truetype(path, int(size))
	return ImageFont.load_default()


def rot_ellipse(cx, cy, rx, ry, ang, n=28):
	ca, sa = math.cos(ang), math.sin(ang)
	out = []
	for i in range(n):
		a = 2 * math.pi * i / n
		x, y = rx * math.cos(a), ry * math.sin(a)
		out.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
	return out


def rot_poly(pts, cx, cy, ang):
	ca, sa = math.cos(ang), math.sin(ang)
	return [(cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca) for x, y in pts]


def star_pts(cx, cy, r_out, r_in, n=5, rot=-math.pi / 2):
	return [
		(
			cx + (r_out if i % 2 == 0 else r_in) * math.cos(rot + i * math.pi / n),
			cy + (r_out if i % 2 == 0 else r_in) * math.sin(rot + i * math.pi / n),
		)
		for i in range(2 * n)
	]


def heart_pts(cx, cy, s, n=40):
	pts = []
	for i in range(n):
		a = 2 * math.pi * i / n
		x = 16 * math.sin(a) ** 3
		y = -(13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a))
		pts.append((cx + x * s / 17, cy + y * s / 17))
	return pts


def round_line(d, pts, fill, width):
	if len(pts) < 2:
		return
	d.line(pts, fill=fill, width=int(width), joint="curve")
	r = width / 2
	for x, y in (pts[0], pts[-1]):
		d.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def circle(d, x, y, r, fill=None, outline=None, width=1):
	d.ellipse([x - r, y - r, x + r, y + r], fill=fill, outline=outline, width=int(width))


class Path:
	def __init__(self, pts, closed=False):
		self.pts = list(pts) + ([pts[0]] if closed else [])
		self.cum = [0.0]
		for a, b in zip(self.pts, self.pts[1:]):
			self.cum.append(self.cum[-1] + math.dist(a, b))
		self.L = self.cum[-1]

	def at(self, t):
		s = clamp(t) * self.L
		for i in range(len(self.pts) - 1):
			if s <= self.cum[i + 1] or i == len(self.pts) - 2:
				a, b = self.pts[i], self.pts[i + 1]
				seg = self.cum[i + 1] - self.cum[i]
				u = (s - self.cum[i]) / seg if seg else 0
				return (lerp(a[0], b[0], u), lerp(a[1], b[1], u)), math.atan2(b[1] - a[1], b[0] - a[0])

	def sub(self, t0, t1):
		s0, s1 = clamp(t0) * self.L, clamp(t1) * self.L
		out = [self.at(t0)[0]]
		out += [self.pts[i] for i in range(1, len(self.pts) - 1) if s0 < self.cum[i] < s1]
		out.append(self.at(t1)[0])
		return out

	def dashes(self, dash, gap):
		segs, s = [], 0.0
		while s < self.L:
			segs.append(self.sub(s / self.L, min(s + dash, self.L) / self.L))
			s += dash + gap
		return segs


class Ctx:
	"""One frame of one scene: a drawing surface plus stage geometry."""

	def __init__(self, img, w, h, t, accent):
		self.img, self.w, self.h, self.t, self.accent = img, w, h, t, accent
		self.d = ImageDraw.Draw(img, "RGBA")
		self.u = min(w, h)

	def text(self, x, y, s, size, fill, max_w=None):
		size = int(size)
		if max_w:
			while size > 8 and font(size).getlength(s) > max_w:
				size -= 1
		self.d.text((x, y), s, font=font(size), fill=fill, anchor="mm")

	def fig8(self, s):
		"""Closed figure-of-eight walk over the floor."""
		a = 2 * math.pi * s
		x = self.w / 2 + 0.36 * self.w * math.sin(a)
		y = self.h * 0.5 + 0.28 * self.h * math.sin(2 * a)
		return x, y

	def fig8_dir(self, s):
		(x0, y0), (x1, y1) = self.fig8(s - 0.003), self.fig8(s + 0.003)
		return math.atan2(y1 - y0, x1 - x0)

	def feet(self, pos, ang, phase, size=None, color=FOOT):
		size = size or self.u * 0.12
		x, y = pos
		px, py = -math.sin(ang), math.cos(ang)
		dx, dy = math.cos(ang), math.sin(ang)
		for side, ph in ((-1, 0.0), (1, math.pi)):
			ahead = math.sin(2 * math.pi * phase + ph) * size * 0.35
			cx = x + px * side * size * 0.38 + dx * ahead
			cy = y + py * side * size * 0.38 + dy * ahead
			self.d.polygon(rot_ellipse(cx + dx * size * 0.16, cy + dy * size * 0.16, size * 0.32, size * 0.22, ang), fill=col(color))
			self.d.polygon(rot_ellipse(cx - dx * size * 0.3, cy - dy * size * 0.3, size * 0.2, size * 0.16, ang), fill=col(color))


def walk_between(points, times, t, travel=0.7):
	"""Position moving between `points`, arriving at points[i] at times[i] (looping)."""
	n = len(points)
	j = min(range(n), key=lambda k: (t - times[k]) % 1)
	nxt = (j + 1) % n
	span = (times[nxt] - times[j]) % 1 or 1
	u = smooth(((t - times[j]) % 1) / span / travel)
	(x0, y0), (x1, y1) = points[j], points[nxt]
	moving = 0 < ((t - times[j]) % 1) / span < travel
	return (lerp(x0, x1, u), lerp(y0, y1, u)), math.atan2(y1 - y0, x1 - x0), moving


def confetti_burst(c, x, y, u, radius, count=14):
	for i in range(count):
		a = i * 2 * math.pi / count + (i % 3) * 0.2
		dist = radius * (0.4 + ease_out(u) * (0.8 + 0.2 * (i % 2)))
		px, py = x + math.cos(a) * dist, y + math.sin(a) * dist
		r = c.u * (0.022 if i % 2 else 0.017)
		fill = col(CONFETTI[i % len(CONFETTI)], 1 - smooth((u - 0.6) / 0.4))
		if i % 3 == 0:
			c.d.rectangle([px - r, py - r * 0.6, px + r, py + r * 0.6], fill=fill)
		else:
			circle(c.d, px, py, r, fill=fill)


# ---------------------------------------------------------------- small illustrations
def apple(d, x, y, r, body="#ef4444", leaf="#16a34a"):
	d.line([(x, y - r * 0.6), (x + r * 0.1, y - r * 1.15)], fill=col("#78350f"), width=max(2, int(r * 0.14)))
	for ox in (-0.24, 0.24):
		d.ellipse([x + ox * r - r * 0.78, y - r * 0.8, x + ox * r + r * 0.78, y + r * 0.85], fill=col(body))
	d.ellipse([x - r * 0.75, y - r * 0.3, x + r * 0.75, y + r * 0.95], fill=col(body))
	d.polygon(rot_ellipse(x + r * 0.38, y - r * 0.98, r * 0.36, r * 0.15, -0.5), fill=col(leaf))


def orange_fruit(d, x, y, r, body="#f97316"):
	circle(d, x, y, r, fill=col(body))
	circle(d, x - r * 0.3, y - r * 0.3, r * 0.18, fill=col("#ffffff", 0.45))
	d.polygon(rot_ellipse(x + r * 0.25, y - r * 0.95, r * 0.3, r * 0.13, -0.4), fill=col("#16a34a"))


def grapes(d, x, y, r):
	for gx, gy in ((-0.4, -0.45), (0.0, -0.45), (0.4, -0.45), (-0.2, -0.05), (0.2, -0.05), (0.0, 0.35)):
		circle(d, x + gx * r, y + gy * r + r * 0.15, r * 0.3, fill=col("#7c3aed"))
	d.polygon(rot_ellipse(x + r * 0.2, y - r * 0.75, r * 0.32, r * 0.13, -0.3), fill=col("#16a34a"))


def banana(d, x, y, r):
	pts = []
	for i in range(13):
		a = math.radians(200 + i * 11.5)
		pts.append((x + math.cos(a) * r, y + math.sin(a) * r * 0.75 + r * 0.55))
	for i in range(13):
		a = math.radians(338 - i * 11.5)
		pts.append((x + math.cos(a) * r * 0.62, y + math.sin(a) * r * 0.4 + r * 0.55))
	d.polygon(pts, fill=col("#facc15"))


def flower(d, x, y, r, petal, stem_len=0.0):
	if stem_len:
		d.line([(x, y), (x, y + stem_len)], fill=col("#16a34a"), width=max(2, int(r * 0.25)))
		d.polygon(rot_ellipse(x + r * 0.55, y + stem_len * 0.6, r * 0.55, r * 0.22, -0.5), fill=col("#22c55e"))
	for i in range(6):
		a = i * math.pi / 3
		circle(d, x + math.cos(a) * r * 0.62, y + math.sin(a) * r * 0.62, r * 0.45, fill=col(petal))
	circle(d, x, y, r * 0.42, fill=col("#facc15"))


def bird(d, x, y, r, body="#3b82f6"):
	d.polygon([(x - r * 0.9, y), (x - r * 1.5, y - r * 0.3), (x - r * 1.45, y + r * 0.35)], fill=col(body))
	d.ellipse([x - r, y - r * 0.7, x + r * 0.8, y + r * 0.7], fill=col(body))
	d.ellipse([x - r * 0.3, y - r * 0.1, x + r * 0.7, y + r * 0.6], fill=col("#bfdbfe"))
	circle(d, x + r * 0.75, y - r * 0.55, r * 0.5, fill=col(body))
	d.polygon([(x + r * 1.15, y - r * 0.6), (x + r * 1.6, y - r * 0.45), (x + r * 1.15, y - r * 0.35)], fill=col("#f59e0b"))
	circle(d, x + r * 0.9, y - r * 0.65, r * 0.1, fill=col("#111827"))
	d.polygon(rot_ellipse(x - r * 0.15, y - r * 0.05, r * 0.6, r * 0.28, 0.35), fill=col(mix(body, "#1e3a8a", 0.4)))


def car(d, x, y, r, body="#ef4444"):
	d.rounded_rectangle([x - r * 1.5, y - r * 0.3, x + r * 1.5, y + r * 0.45], radius=r * 0.25, fill=col(body))
	d.polygon([(x - r * 0.85, y - r * 0.3), (x - r * 0.5, y - r * 0.85), (x + r * 0.6, y - r * 0.85), (x + r * 0.95, y - r * 0.3)], fill=col(body))
	d.polygon([(x - r * 0.68, y - r * 0.35), (x - r * 0.42, y - r * 0.72), (x + r * 0.02, y - r * 0.72), (x + r * 0.02, y - r * 0.35)], fill=col("#bae6fd"))
	d.polygon([(x + r * 0.12, y - r * 0.35), (x + r * 0.12, y - r * 0.72), (x + r * 0.52, y - r * 0.72), (x + r * 0.78, y - r * 0.35)], fill=col("#bae6fd"))
	for wx in (-0.85, 0.85):
		circle(d, x + wx * r, y + r * 0.45, r * 0.36, fill=col("#1f2937"))
		circle(d, x + wx * r, y + r * 0.45, r * 0.15, fill=col("#d1d5db"))


def cat(d, x, y, r):
	for side in (-1, 1):
		d.polygon([(x + side * r * 0.9, y - r * 0.3), (x + side * r * 0.75, y - r * 1.15), (x + side * r * 0.2, y - r * 0.75)], fill=col("#f97316"))
		d.polygon([(x + side * r * 0.75, y - r * 0.45), (x + side * r * 0.7, y - r * 0.95), (x + side * r * 0.38, y - r * 0.72)], fill=col("#fda4af"))
	circle(d, x, y, r * 0.95, fill=col("#f97316"))
	for side in (-1, 1):
		d.ellipse([x + side * r * 0.38 - r * 0.13, y - r * 0.3, x + side * r * 0.38 + r * 0.13, y + r * 0.02], fill=col("#111827"))
		for k in (-1, 1):
			d.line([(x + side * r * 0.3, y + r * 0.28), (x + side * r * 1.15, y + r * 0.2 + k * r * 0.18)], fill=col("#7c2d12"), width=max(1, int(r * 0.05)))
	d.polygon([(x - r * 0.12, y + r * 0.12), (x + r * 0.12, y + r * 0.12), (x, y + r * 0.28)], fill=col("#fda4af"))
	d.arc([x - r * 0.25, y + r * 0.15, x, y + r * 0.45], 0, 180, fill=col("#7c2d12"), width=max(1, int(r * 0.06)))
	d.arc([x, y + r * 0.15, x + r * 0.25, y + r * 0.45], 0, 180, fill=col("#7c2d12"), width=max(1, int(r * 0.06)))


def face(d, x, y, r, mood):
	circle(d, x, y, r, fill=col("#facc15"))
	w = max(2, int(r * 0.1))
	for side in (-1, 1):
		circle(d, x + side * r * 0.35, y - r * 0.2, r * 0.11, fill=col("#111827"))
	if mood == "happy":
		d.arc([x - r * 0.5, y - r * 0.3, x + r * 0.5, y + r * 0.55], 20, 160, fill=col("#111827"), width=w)
	elif mood == "sad":
		d.arc([x - r * 0.45, y + r * 0.25, x + r * 0.45, y + r * 0.85], 200, 340, fill=col("#111827"), width=w)
	else:  # angry
		for side in (-1, 1):
			d.line([(x + side * r * 0.55, y - r * 0.5), (x + side * r * 0.15, y - r * 0.32)], fill=col("#111827"), width=w)
		d.line([(x - r * 0.35, y + r * 0.45), (x + r * 0.35, y + r * 0.45)], fill=col("#111827"), width=w)


def beach_ball(d, x, y, r, rot=0.0):
	for i in range(6):
		start = math.degrees(rot) + i * 60
		d.pieslice([x - r, y - r, x + r, y + r], start, start + 60, fill=col(["#ef4444", "#ffffff", "#3b82f6", "#ffffff", "#facc15", "#ffffff"][i]))
	circle(d, x, y, r, outline=col("#cbd5e1"), width=max(1, r * 0.06))
	circle(d, x, y, r * 0.16, fill=col("#ffffff"))


def cup(d, x, y, r):
	d.polygon([(x - r * 0.7, y - r * 0.7), (x + r * 0.55, y - r * 0.7), (x + r * 0.4, y + r * 0.75), (x - r * 0.55, y + r * 0.75)], fill=col("#0ea5e9"))
	d.arc([x + r * 0.25, y - r * 0.45, x + r * 1.0, y + r * 0.3], 270, 90, fill=col("#0ea5e9"), width=max(2, int(r * 0.16)))


def book(d, x, y, r):
	d.rounded_rectangle([x - r * 0.75, y - r * 0.9, x + r * 0.75, y + r * 0.9], radius=r * 0.1, fill=col("#16a34a"))
	d.rectangle([x - r * 0.75, y - r * 0.9, x - r * 0.5, y + r * 0.9], fill=col("#15803d"))
	d.rectangle([x - r * 0.25, y - r * 0.5, x + r * 0.5, y - r * 0.3], fill=col("#dcfce7"))


def candy(d, x, y, r, body, ang=0.0):
	for side in (-1, 1):
		d.polygon(
			rot_poly([(x + side * r * 0.8, y), (x + side * r * 1.55, y - r * 0.6), (x + side * r * 1.55, y + r * 0.6)], x, y, ang),
			fill=col(mix(body, "#ffffff", 0.25)),
		)
	circle(d, x, y, r, fill=col(body))
	d.line(rot_poly([(x - r * 0.6, y + r * 0.45), (x + r * 0.6, y - r * 0.45)], x, y, ang), fill=col("#ffffff", 0.8), width=max(2, int(r * 0.25)))


def shape(d, kind, x, y, r, fill):
	if kind == "circle":
		circle(d, x, y, r, fill=col(fill))
	elif kind == "square":
		d.rounded_rectangle([x - r * 0.85, y - r * 0.85, x + r * 0.85, y + r * 0.85], radius=r * 0.12, fill=col(fill))
	elif kind == "triangle":
		d.polygon([(x, y - r), (x + r * 0.95, y + r * 0.75), (x - r * 0.95, y + r * 0.75)], fill=col(fill))
	elif kind == "star":
		d.polygon(star_pts(x, y, r, r * 0.45), fill=col(fill))


# ---------------------------------------------------------------- scenes
def scene_trace(c, kind):
	t = c.t
	b = c.h * 0.8
	cx, cy = c.w / 2, c.h * 0.5
	if kind == "star":
		norm = [star_pts(0.5, 0.55, 0.5, 0.22)]
		bw = b
		closed = True
	elif kind == "letter":
		norm = [[(0.12, 1), (0.5, 0), (0.88, 1)], [(0.28, 0.62), (0.72, 0.62)]]
		bw = b * 0.8
		closed = False
	else:  # number 2
		arc = [(0.5 + 0.36 * math.cos(math.radians(a)), 0.3 + 0.3 * math.sin(math.radians(a))) for a in range(200, 395, 15)]
		norm = [arc + [(0.12, 1.0), (0.9, 1.0)]]
		bw = b * 0.7
		closed = False
	x0, y0 = cx - bw / 2, cy - b / 2
	strokes = [Path([(x0 + px * bw, y0 + py * b) for px, py in s], closed) for s in norm]
	total = sum(s.L for s in strokes)

	p = smooth(t / 0.6)
	f = smooth((t - 0.6) / 0.08)
	o = 1 - smooth((t - 0.86) / 0.12)
	line_w = c.u * 0.04

	if f * o > 0:
		if closed:
			pts = strokes[0].pts[:-1]
			s = 0.85 + 0.15 * f + 0.07 * math.sin(math.pi * clamp((t - 0.6) / 0.14))
			c.d.polygon([(cx + (x - cx) * s, cy + (y - cy) * s) for x, y in pts], fill=col("#fbbf24", f * o))
		else:
			for s in strokes:
				round_line(c.d, s.pts, col("#fbbf24", f * o), c.u * 0.13)

	for s in strokes:
		for seg in s.dashes(c.u * 0.06, c.u * 0.045):
			round_line(c.d, seg, col("#ffffff"), line_w * 0.75)

	done = p * total
	pos, ang = strokes[0].at(0)
	for s in strokes:
		if done <= 0:
			break
		part = min(1.0, done / s.L)
		round_line(c.d, s.sub(0, part), col(TRACE_BLUE, o), line_w)
		pos, ang = s.at(part)
		done -= s.L
	if p >= 1:
		pos, ang = strokes[0].at(0)

	if 0.6 < t < 0.88:
		confetti_burst(c, cx, cy, (t - 0.6) / 0.28, b * 0.62)
	c.feet(pos, ang, p * total / (c.u * 0.17))


def scene_paint(c):
	t = c.t
	segs = 70
	for i in range(segs):
		s0 = t - 0.6 + 0.6 * i / segs
		s1 = s0 + 0.6 / segs + 0.002
		color = RAINBOW[int(((s0 % 1) * 5)) % len(RAINBOW)]
		round_line(c.d, [c.fig8(s0), c.fig8(s1)], col(color), c.u * 0.07)
	current = RAINBOW[int(((t % 1) * 5)) % len(RAINBOW)]
	r = c.u * 0.045
	for i, color in enumerate(RAINBOW[:5]):
		x, y = c.w * 0.06 + i * r * 2.6, c.h * 0.1
		if color == current:
			circle(c.d, x, y, r * 1.35, fill=col("#ffffff"))
		circle(c.d, x, y, r, fill=col(color))
	c.feet(c.fig8(t), c.fig8_dir(t), t * 14)


DARK_TRAILS = {"firework": "#1e1b4b", "firefly": "#1e293b", "galaxy": "#1e1b4b", "ember": "#292524"}
TRAIL_BG = {**DARK_TRAILS, "snow": "#93c5fd", "bubble-under": "#7dd3fc"}


def scene_trail(c, theme):
	t = c.t
	if theme == "ribbon":
		for k, color in enumerate(RAINBOW[:5]):
			off = (k - 2) * c.u * 0.03
			pts = []
			for i in range(50):
				s = t - 0.4 + 0.4 * i / 49
				(x, y), a = c.fig8(s), c.fig8_dir(s)
				pts.append((x - math.sin(a) * off, y + math.cos(a) * off))
			round_line(c.d, pts, col(color), c.u * 0.032)
		c.feet(c.fig8(t), c.fig8_dir(t), t * 14, color="#ffffff" if False else FOOT)
		return

	m, life = 40, 0.5
	sz = c.u * 0.1
	for i in range(m):
		s = i / m
		age = (t - s) % 1
		if age >= life:
			continue
		a = age / life
		alpha = 1 - smooth((a - 0.5) / 0.5)
		x, y = c.fig8(s)
		rng = random.Random(i * 7 + 3)
		jx, jy = rng.uniform(-1, 1) * sz, rng.uniform(-1, 1) * sz
		x, y = x + jx, y + jy
		color = CONFETTI[i % len(CONFETTI)]
		d = c.d
		if theme == "confetti":
			pts = rot_poly([(x - sz * 0.4, y - sz * 0.22), (x + sz * 0.4, y - sz * 0.22), (x + sz * 0.4, y + sz * 0.22), (x - sz * 0.4, y + sz * 0.22)], x, y, i + a * 5)
			d.polygon([(px, py + a * sz * 2) for px, py in pts], fill=col(color, alpha))
		elif theme == "petal":
			pc = ["#f472b6", "#fb7185", "#f9a8d4", "#e879f9"][i % 4]
			if i % 5 == 0:
				flower(d, x, y, sz * 0.55, pc)
			else:
				d.polygon(rot_ellipse(x + a * sz, y + a * sz * 1.5, sz * 0.45, sz * 0.22, i + a * 3), fill=col(pc, alpha))
		elif theme == "ice":
			r = sz * (0.5 + 0.4 * ease_out(a * 2))
			for k in range(3):
				ang = k * math.pi / 3 + i
				ex, ey = math.cos(ang) * r, math.sin(ang) * r
				d.line([(x - ex, y - ey), (x + ex, y + ey)], fill=col("#0284c7", alpha), width=max(2, int(sz * 0.12)))
			circle(d, x, y, sz * 0.14, fill=col("#e0f2fe", alpha))
		elif theme == "bubble-under":
			r = sz * (0.25 + 0.25 * (i % 3) / 2)
			bx = x + math.sin(a * 8 + i) * sz * 0.4
			by = y - a * sz * 4
			circle(d, bx, by, r, fill=col("#ffffff", 0.25 * alpha), outline=col("#ffffff", alpha), width=sz * 0.08)
		elif theme == "firework":
			r = sz * (0.3 + 1.6 * ease_out(a))
			for k in range(8):
				ang = k * math.pi / 4 + i
				round_line(d, [(x + math.cos(ang) * r * 0.55, y + math.sin(ang) * r * 0.55), (x + math.cos(ang) * r, y + math.sin(ang) * r)], col(color, alpha), sz * 0.12)
		elif theme == "paw":
			ang = c.fig8_dir(s)
			side = 1 if i % 2 else -1
			px, py = x - jx - math.sin(ang) * side * sz * 0.5, y - jy + math.cos(ang) * side * sz * 0.5
			circle(d, px, py, sz * 0.38, fill=col("#92400e", alpha))
			for k in range(4):
				ta = ang + (k - 1.5) * 0.5
				circle(d, px + math.cos(ta) * sz * 0.62, py + math.sin(ta) * sz * 0.62, sz * 0.16, fill=col("#92400e", alpha))
		elif theme == "candy":
			candy(d, x, y + a * sz, sz * 0.38, color, i)
		elif theme == "cloud":
			r = sz * (0.35 + 0.25 * ease_out(a))
			cy_ = y - a * sz * 1.5
			for ox, oy, k in ((-0.7, 0.1, 0.7), (0, -0.25, 1.0), (0.7, 0.1, 0.75)):
				circle(d, x + ox * r + r * 0.12, cy_ + oy * r + r * 0.15, r * k, fill=col("#94a3b8", 0.35 * alpha))
			for ox, oy, k in ((-0.7, 0.1, 0.7), (0, -0.25, 1.0), (0.7, 0.1, 0.75)):
				circle(d, x + ox * r, cy_ + oy * r, r * k, fill=col("#ffffff", alpha))
		elif theme == "rainbow-star":
			r = sz * (0.4 + 0.15 * math.sin(a * math.pi * 3))
			d.polygon(rot_poly(star_pts(x, y, r, r * 0.45), x, y, a * 2), fill=col(RAINBOW[i % 6], alpha))
		elif theme == "heart":
			d.polygon(heart_pts(x, y - a * sz * 2.5, sz * 0.45), fill=col(["#f43f5e", "#ec4899", "#fb7185"][i % 3], alpha))
		elif theme == "firefly":
			blink = 0.5 + 0.5 * math.sin(a * 12 + i)
			fx, fy = x + math.sin(a * 5 + i) * sz, y - a * sz * 1.5
			circle(d, fx, fy, sz * 0.45, fill=col("#fde047", 0.22 * alpha * blink))
			circle(d, fx, fy, sz * 0.16, fill=col("#fef08a", alpha * (0.5 + 0.5 * blink)))
		elif theme == "glitter":
			r = sz * 0.45 * (0.4 + 0.6 * abs(math.sin(a * math.pi * 2 + i)))
			gc = ["#22d3ee", "#a5f3fc", "#f0abfc", "#ffffff"][i % 4]
			d.polygon([(x, y - r), (x + r * 0.6, y), (x, y + r), (x - r * 0.6, y)], fill=col(gc, alpha))
		elif theme == "soap":
			r = sz * (0.3 + 0.2 * (i % 3) / 2)
			bx, by = x + math.sin(a * 6 + i) * sz * 0.3, y - a * sz * 2.5
			circle(d, bx, by, r, fill=col(["#f9a8d4", "#a5f3fc", "#c4b5fd"][i % 3], 0.35 * alpha), outline=col("#60a5fa", alpha), width=sz * 0.06)
			d.arc([bx - r * 0.7, by - r * 0.7, bx + r * 0.3, by + r * 0.3], 190, 260, fill=col("#ffffff", alpha), width=max(2, int(sz * 0.08)))
		elif theme == "galaxy":
			for k in range(3):
				ang = i + k * 2.1 + a * 5
				rr = sz * (0.2 + 1.2 * a) * (0.6 + 0.2 * k)
				circle(d, x + math.cos(ang) * rr, y + math.sin(ang) * rr, sz * 0.14, fill=col(["#a78bfa", "#60a5fa", "#f472b6"][k], alpha))
			if i % 3 == 0:
				d.polygon(star_pts(x, y, sz * 0.25, sz * 0.1), fill=col("#ffffff", alpha))
		elif theme == "magic":
			r = sz * 0.5 * (0.5 + 0.5 * math.sin(a * math.pi))
			pts = []
			for k in range(8):
				ang = a * 3 + k * math.pi / 4
				rr = r if k % 2 == 0 else r * 0.28
				pts.append((x + math.cos(ang) * rr, y + math.sin(ang) * rr))
			d.polygon(pts, fill=col(["#facc15", "#c084fc", "#fbbf24"][i % 3], alpha))
		elif theme == "ember":
			r = sz * 0.22 * (1 - a * 0.7)
			circle(d, x + math.sin(a * 7 + i) * sz * 0.3, y - a * sz * 3, r, fill=col(["#f97316", "#ef4444", "#facc15"][i % 3], alpha))
		elif theme == "snow":
			r = sz * 0.18 * (1 + (i % 3) * 0.3)
			circle(d, x + math.sin(a * 6 + i) * sz * 0.3, y + a * sz * 2.5, r, fill=col("#ffffff", alpha))
		elif theme == "paint":
			r = sz * 0.4 * ease_out(a * 4)
			circle(d, x, y, r, fill=col(color, alpha))
			for k in range(4):
				ang = i + k * 1.7
				circle(d, x + math.cos(ang) * r * 1.5, y + math.sin(ang) * r * 1.5, r * 0.25, fill=col(color, alpha))
		elif theme == "stardust":
			sy = y + a * sz * 3.5
			d.polygon(star_pts(x, sy, sz * 0.38, sz * 0.16), fill=col(["#facc15", "#f59e0b", "#fbbf24"][i % 3], alpha))
	foot = "#fde68a" if theme in DARK_TRAILS else FOOT
	c.feet(c.fig8(t), c.fig8_dir(t), t * 14, color=foot)


def scene_ripple(c):
	t = c.t
	for k in range(4):
		y = c.h * (0.15 + 0.25 * k)
		pts = [(x, y + math.sin(x / c.w * 12 + k) * c.u * 0.015) for x in range(0, int(c.w) + 20, 20)]
		c.d.line(pts, fill=col("#ffffff", 0.35), width=max(2, int(c.u * 0.012)))
	m = 12
	for i in range(m):
		s = i / m
		age = (t - s) % 1
		if age > 0.6:
			continue
		a = age / 0.6
		x, y = c.fig8(s)
		for k in (0, 0.45):
			r = c.u * (0.04 + 0.22 * ease_out(clamp(a - k * 0.3)))
			c.d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], outline=col("#ffffff", (1 - a) * 0.9), width=max(2, int(c.u * 0.015)))
	c.feet(c.fig8(t), c.fig8_dir(t), t * 14)


def scene_sweep(c, item):
	t = c.t
	fx, fy = c.fig8(t)
	rng = random.Random(42)
	cols, rows = 9, 5
	push_r = c.u * 0.3
	for j in range(rows):
		for i in range(cols):
			hx = (i + 0.5 + rng.uniform(-0.3, 0.3)) / cols * c.w
			hy = (j + 0.5 + rng.uniform(-0.3, 0.3)) / rows * c.h
			dx, dy = hx - fx, hy - fy
			dist = math.hypot(dx, dy) or 1
			push = max(0.0, push_r - dist) * 0.9
			x, y = hx + dx / dist * push, hy + dy / dist * push
			ang = rng.uniform(0, 6.28) + push / c.u * 3
			r = c.u * 0.06
			k = rng.randrange(3)
			if item == "leaf":
				lc = ["#ea580c", "#dc2626", "#ca8a04"][k]
				c.d.polygon(rot_ellipse(x, y, r, r * 0.5, ang), fill=col(lc))
				c.d.line([(x - math.cos(ang) * r, y - math.sin(ang) * r), (x + math.cos(ang) * r, y + math.sin(ang) * r)], fill=col(mix(lc, "#000000", 0.3)), width=max(1, int(r * 0.12)))
			elif item == "shell":
				sc = ["#fda4af", "#fdba74", "#fef3c7"][k]
				deg = math.degrees(ang)
				c.d.pieslice([x - r, y - r, x + r, y + r], deg, deg + 180, fill=col(sc))
				for q in range(1, 5):
					a2 = ang + q * math.pi / 5
					c.d.line([(x, y), (x + math.cos(a2) * r, y + math.sin(a2) * r)], fill=col(mix(sc, "#7c2d12", 0.35)), width=max(1, int(r * 0.1)))
			else:
				if k == 0:
					apple(c.d, x, y, r * 0.8)
				elif k == 1:
					orange_fruit(c.d, x, y, r * 0.8)
				else:
					orange_fruit(c.d, x, y, r * 0.75, "#facc15")
	c.feet((fx, fy), c.fig8_dir(t), t * 14)


def draw_subject(d, subject, x0, y0, bw, bh):
	cx, cy = x0 + bw / 2, y0 + bh / 2
	r = min(bw, bh)
	if subject == "flowers":
		d.rectangle([x0, y0 + bh * 0.78, x0 + bw, y0 + bh], fill=col("#86efac"))
		for fx, petal, fy in ((0.22, "#f472b6", 0.38), (0.5, "#a78bfa", 0.28), (0.78, "#fb923c", 0.42)):
			flower(d, x0 + bw * fx, y0 + bh * fy, r * 0.13, petal, stem_len=bh * (0.8 - fy))
	elif subject == "birds":
		d.line([(x0, y0 + bh * 0.72), (x0 + bw, y0 + bh * 0.62)], fill=col("#92400e"), width=max(3, int(r * 0.05)))
		bird(d, cx, cy, r * 0.22)
	elif subject == "fruit":
		apple(d, cx - bw * 0.25, cy + bh * 0.05, r * 0.2)
		orange_fruit(d, cx + bw * 0.02, cy + bh * 0.08, r * 0.17)
		grapes(d, cx + bw * 0.28, cy + bh * 0.02, r * 0.2)
	elif subject == "apple":
		apple(d, cx, cy + bh * 0.06, r * 0.32)
	elif subject == "vehicles":
		d.rectangle([x0, y0 + bh * 0.8, x0 + bw, y0 + bh], fill=col("#9ca3af"))
		car(d, cx, cy + bh * 0.12, r * 0.24)
	else:  # animals / cat
		cat(d, cx, cy + bh * 0.08, r * 0.32)


def scene_reveal(c, subject, options=None, correct=0):
	t = c.t
	ph = c.h * 0.84
	pw = min(ph * 1.3, c.w * (0.56 if options else 0.86))
	x0 = c.w * 0.05 if options else (c.w - pw) / 2
	y0 = (c.h - ph) / 2
	c.d.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], radius=c.u * 0.04, fill=col("#fefce8"))
	draw_subject(c.d, subject, x0, y0, pw, ph)

	gc, gr = 5, 4
	tw, th = pw / gc, ph / gr
	order = [(i if j % 2 == 0 else gc - 1 - i, j) for j in range(gr) for i in range(gc)]
	p = t / 0.62
	o = 1 - smooth((t - 0.86) / 0.12)
	cover = mix(c.accent, "#ffffff", 0.55)
	for k, (i, j) in enumerate(order):
		reveal = clamp((p - k / len(order)) * len(order) / 2)
		vis = 1 - ease_out(reveal) * o
		if vis <= 0.01:
			continue
		tx, ty = x0 + (i + 0.5) * tw, y0 + (j + 0.5) * th
		hw, hh = tw / 2 * vis, th / 2 * vis
		if hw < 3 or hh < 3:
			continue
		c.d.rounded_rectangle([tx - hw + 1, ty - hh + 1, tx + hw - 1, ty + hh - 1], radius=c.u * 0.015, fill=col(cover))
		c.d.rounded_rectangle([tx - hw * 0.5, ty - hh * 0.5, tx + hw * 0.5, ty + hh * 0.5], radius=c.u * 0.01, fill=col("#ffffff", 0.25))

	path_pts = [(x0 + (i + 0.5) * tw, y0 + (j + 0.5) * th) for i, j in order]
	walk = Path(path_pts)
	if options:
		ox = x0 + pw + c.w * 0.04
		ow = c.w - ox - c.w * 0.04
		oh = ph / 3 - c.h * 0.04
		chips = []
		for k, label in enumerate(options):
			oy = y0 + k * (oh + c.h * 0.06)
			chips.append((ox + ow * 0.5, oy + oh * 0.95))
			appear = smooth((t - 0.3 - k * 0.06) / 0.08) * o
			if appear <= 0:
				continue
			picked = k == correct and 0.74 < t < 0.92
			fill = col(GOOD if picked else "#ffffff", appear)
			c.d.rounded_rectangle([ox, oy, ox + ow, oy + oh], radius=oh * 0.3, fill=fill, outline=col(c.accent, appear * 0.5), width=max(2, int(c.u * 0.01)))
			c.text(ox + ow / 2, oy + oh / 2, label, oh * 0.48, col("#ffffff" if picked else c.accent, appear), max_w=ow * 0.85)
		if t < 0.62:
			pos, ang = walk.at(p)
		else:
			(pos, ang, _) = walk_between([walk.at(1)[0], chips[correct]], [0.62, 0.74], t if t < 0.95 else 0.95)
			if t >= 0.74:
				pos = chips[correct]
		c.feet(pos, ang, t * 18, size=c.u * 0.1)
	else:
		if 0.62 < t < 0.88:
			confetti_burst(c, x0 + pw / 2, y0 + ph / 2, (t - 0.62) / 0.26, ph * 0.55)
		pos, ang = walk.at(clamp(p))
		c.feet(pos, ang, t * 18, size=c.u * 0.1)


def draw_pop_target(d, kind, x, y, r, color, ang=0.0):
	if kind == "balloon":
		d.line([(x, y + r), (x + r * 0.15, y + r * 1.5), (x - r * 0.1, y + r * 2.0)], fill=col("#94a3b8"), width=max(1, int(r * 0.06)))
		d.polygon([(x, y + r * 0.9), (x - r * 0.15, y + r * 1.12), (x + r * 0.15, y + r * 1.12)], fill=col(color))
		d.ellipse([x - r * 0.8, y - r, x + r * 0.8, y + r], fill=col(color))
		d.polygon(rot_ellipse(x - r * 0.35, y - r * 0.45, r * 0.18, r * 0.28, 0.4), fill=col("#ffffff", 0.55))
	elif kind == "heart":
		d.line([(x, y + r), (x + r * 0.15, y + r * 1.5), (x - r * 0.1, y + r * 2.0)], fill=col("#94a3b8"), width=max(1, int(r * 0.06)))
		d.polygon(heart_pts(x, y, r), fill=col(color))
		d.polygon(rot_ellipse(x - r * 0.45, y - r * 0.35, r * 0.15, r * 0.24, 0.6), fill=col("#ffffff", 0.55))
	elif kind == "bubble":
		circle(d, x, y, r, fill=col(color, 0.25), outline=col(color), width=r * 0.1)
		d.arc([x - r * 0.75, y - r * 0.75, x + r * 0.35, y + r * 0.35], 190, 260, fill=col("#ffffff"), width=max(2, int(r * 0.14)))
	elif kind == "candy":
		candy(d, x, y, r * 0.65, color, ang)
	else:
		beach_ball(d, x, y, r, ang)


def scene_pop(c, kind):
	t = c.t
	r = c.u * 0.12
	homes = [(0.14, 0.38), (0.32, 0.7), (0.5, 0.32), (0.68, 0.68), (0.86, 0.36)]
	colors = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#ec4899"] if kind != "heart" else ["#f43f5e", "#ec4899", "#e11d48", "#fb7185", "#db2777"]
	if kind == "bubble":
		colors = ["#0ea5e9", "#8b5cf6", "#06b6d4", "#3b82f6", "#a855f7"]
	pops = [(1, 0.18), (2, 0.51), (4, 0.84)]
	pos_by = {}
	for i, (hx, hy) in enumerate(homes):
		x = hx * c.w
		y = hy * c.h + math.sin(2 * math.pi * (t + i * 0.2)) * c.u * 0.03
		pos_by[i] = (x, y)
		scale = 1.0
		for idx, when in pops:
			if idx == i:
				since = (t - when) % 1
				if since < 0.22:
					scale = 0.0
				elif since < 0.34:
					scale = ease_out((since - 0.22) / 0.12)
		if scale > 0.01:
			draw_pop_target(c.d, kind, x, y, r * scale, colors[i], t * 2 if kind == "ball" else 0.3 * i)
	for idx, when in pops:
		since = (t - when) % 1
		if since < 0.2:
			u = since / 0.2
			x, y = pos_by[idx]
			for k in range(8):
				a = k * math.pi / 4
				r0, r1 = r * (0.6 + 0.7 * ease_out(u)), r * (1.0 + 0.9 * ease_out(u))
				round_line(c.d, [(x + math.cos(a) * r0, y + math.sin(a) * r0), (x + math.cos(a) * r1, y + math.sin(a) * r1)], col(colors[idx], 1 - u), c.u * 0.02)
	targets = [pos_by[i] for i, _ in pops]
	targets = [(x, y + r * 0.2) for x, y in targets]
	pos, ang, moving = walk_between(targets, [w for _, w in pops], t, travel=0.75)
	c.feet(pos, ang, t * 16 if moving else 0, size=c.u * 0.13)


def scene_catch(c):
	t = c.t
	apples = [(0.28, 0.0), (0.72, 1 / 3), (0.5, 2 / 3)]
	fall = 0.4
	top_y, land_y, basket_top = c.h * 0.12, c.h * 0.8, c.h * 0.7
	c.d.rectangle([0, c.h * 0.9, c.w, c.h], fill=col("#5eead4"))
	ar = c.u * 0.075
	for x, s in apples:
		dt = (t - s) % 1
		if dt < fall:
			u = dt / fall
			apple(c.d, x * c.w, lerp(top_y, land_y, u * u), ar)
	for i, (x, r) in enumerate(((0.0, 0.2), (0.16, 0.17), (0.33, 0.21), (0.5, 0.18), (0.66, 0.22), (0.83, 0.17), (1.0, 0.21))):
		cy = -c.u * 0.04 + (i % 3) * c.u * 0.03
		circle(c.d, x * c.w, cy, r * c.u, fill=col("#10b981" if i % 2 == 0 else "#34d399"))
	lands = sorted(((s + fall) % 1, x) for x, s in apples)
	(bx, _), _, _ = walk_between([(x * c.w, 0) for _, x in lands], [w for w, _ in lands], t, travel=0.75)
	bw_top, bw_bot, bh = c.u * 0.36, c.u * 0.27, c.u * 0.18
	c.d.polygon([(bx - bw_top / 2, basket_top), (bx + bw_top / 2, basket_top), (bx + bw_bot / 2, basket_top + bh), (bx - bw_bot / 2, basket_top + bh)], fill=col("#d97706"))
	for k in (0.3, 0.62):
		y0 = basket_top + bh * k
		w0, w1 = lerp(bw_top, bw_bot, k) / 2, lerp(bw_top, bw_bot, k + 0.14) / 2
		c.d.polygon([(bx - w0, y0), (bx + w0, y0), (bx + w1, y0 + bh * 0.14), (bx - w1, y0 + bh * 0.14)], fill=col("#f59e0b"))
	c.d.rounded_rectangle([bx - bw_top * 0.55, basket_top - bh * 0.1, bx + bw_top * 0.55, basket_top + bh * 0.12], radius=bh * 0.11, fill=col("#92400e"))
	for x, s in apples:
		dt = (t - s) % 1 - fall
		if 0 <= dt < 0.24:
			u = dt / 0.24
			c.text(x * c.w, basket_top - c.u * 0.12 - ease_out(u) * c.u * 0.15, "+1", c.u * 0.1, col("#0f766e", 1 - smooth((u - 0.5) / 0.5)))


def tile_text(c, label, color="#334155"):
	def draw(cx, cy, s):
		c.text(cx, cy, label, s * 0.32, col(color), max_w=s * 0.85)

	return draw


def scene_choose(c, prompt, tiles, correct, prompt_color=None, speaker=False):
	t = c.t
	n = len(tiles)
	gap = c.w * 0.03
	ts = min(c.h * 0.46, (c.w * 0.92 - gap * (n - 1)) / n)
	row_w = n * ts + (n - 1) * gap
	ty = c.h * 0.66
	centers = [(c.w / 2 - row_w / 2 + ts / 2 + k * (ts + gap), ty) for k in range(n)]

	pop_in = ease_out(t / 0.1)
	pw = min(c.w * 0.7, max(c.u * 0.5, font(int(c.u * 0.12)).getlength(prompt) + c.u * 0.16)) * (0.8 + 0.2 * pop_in)
	phh = c.h * 0.2
	pcx, pcy = c.w / 2, c.h * 0.16
	c.d.rounded_rectangle([pcx - pw / 2, pcy - phh / 2, pcx + pw / 2, pcy + phh / 2], radius=phh * 0.45, fill=col("#ffffff", pop_in))
	c.text(pcx, pcy, prompt, phh * 0.55, col(prompt_color or c.accent, pop_in), max_w=pw * 0.88)
	if speaker:
		sx, sy = c.w * 0.92, c.h * 0.16
		s = c.u * 0.05
		c.d.rectangle([sx - s * 0.5, sy - s * 0.4, sx, sy + s * 0.4], fill=col("#334155"))
		c.d.polygon([(sx - s * 0.2, sy - s * 0.4), (sx - s * 1.0, sy - s * 1.0), (sx - s * 1.0, sy + s * 1.0), (sx - s * 0.2, sy + s * 0.4)], fill=col("#334155"))
		for k in range(3):
			ph = (t * 3 + k / 3) % 1
			rr = s * (0.8 + ph * 1.6)
			c.d.arc([sx - rr, sy - rr, sx + rr, sy + rr], -50, 50, fill=col("#334155", 1 - ph), width=max(2, int(s * 0.2)))

	chosen = 0.52 < t < 0.88
	for k, (cx, cy) in enumerate(centers):
		good = chosen and k == correct
		c.d.rounded_rectangle([cx - ts / 2, cy - ts / 2, cx + ts / 2, cy + ts / 2], radius=ts * 0.16, fill=col("#ffffff"), outline=col(GOOD if good else mix(c.accent, "#ffffff", 0.6)), width=max(2, int(ts * (0.06 if good else 0.03))))
		tiles[k](cx, cy, ts)
		if chosen and k != correct:
			c.d.rounded_rectangle([cx - ts / 2, cy - ts / 2, cx + ts / 2, cy + ts / 2], radius=ts * 0.16, fill=col("#ffffff", 0.55))
	if chosen:
		cx, cy = centers[correct]
		u = (t - 0.52) / 0.36
		br = ts * 0.16 * ease_out(u * 4)
		bx, by = cx + ts / 2 - ts * 0.08, cy - ts / 2 + ts * 0.08
		circle(c.d, bx, by, br, fill=col(GOOD))
		if br > 2:
			c.d.line([(bx - br * 0.45, by), (bx - br * 0.1, by + br * 0.35), (bx + br * 0.5, by - br * 0.35)], fill=col("#ffffff"), width=max(2, int(br * 0.28)), joint="curve")
		confetti_burst(c, cx, cy, u, ts * 0.8, count=10)

	start = (c.w / 2, c.h * 1.02)
	target = (centers[correct][0], centers[correct][1] + ts * 0.5)
	if t < 0.15:
		pos, ang, moving = start, -math.pi / 2, False
	elif t < 0.5:
		u = smooth((t - 0.15) / 0.35)
		pos, ang, moving = (lerp(start[0], target[0], u), lerp(start[1], target[1], u)), math.atan2(target[1] - start[1], target[0] - start[0]), True
	elif t < 0.88:
		pos, ang, moving = target, math.atan2(target[1] - start[1], target[0] - start[0]), False
	else:
		u = smooth((t - 0.88) / 0.12)
		pos, ang, moving = (lerp(target[0], start[0], u), lerp(target[1], start[1], u)), math.atan2(start[1] - target[1], start[0] - target[0]), True
	c.feet(pos, ang, t * 16 if moving else 0, size=c.u * 0.11)


def choose_game(prompt, tile_fns, correct, **kw):
	def scene(c):
		tiles = [fn(c) for fn in tile_fns]
		scene_choose(c, prompt, tiles, correct, **kw)

	return scene


def T_draw(fn):
	"""Wrap an illustration fn(d, x, y, r) as a tile factory."""
	return lambda c: lambda x, y, s: fn(c.d, x, y, s * 0.3)


def T_text(label, color="#334155"):
	return lambda c: tile_text(c, label, color)


def T_shape(kind, fill, scale=1.0, distract=False):
	def factory(c):
		def draw(x, y, s):
			if distract:
				for k in range(6):
					a = k * 1.05 + 0.4
					circle(c.d, x + math.cos(a) * s * 0.36, y + math.sin(a) * s * 0.36, s * 0.04, fill=col(CONFETTI[k]))
			shape(c.d, kind, x, y, s * 0.27 * scale, fill)

		return draw

	return factory


def T_arrow(direction):
	def factory(c):
		def draw(x, y, s):
			w = max(2, int(s * 0.08))
			ay = y - s * 0.1
			L = s * 0.28
			c.d.line([(x - L, ay), (x + L, ay)], fill=col("#334155"), width=w)
			for sgn in ((-1,) if direction == "left" else (1,) if direction == "right" else (-1, 1)):
				tip = x + sgn * L
				c.d.polygon([(tip + sgn * s * 0.08, ay), (tip - sgn * s * 0.08, ay - s * 0.12), (tip - sgn * s * 0.08, ay + s * 0.12)], fill=col("#334155"))
			c.text(x, y + s * 0.24, direction.capitalize(), s * 0.18, col("#334155"), max_w=s * 0.85)

		return draw

	return factory


def T_texture(kind):
	def factory(c):
		def draw(x, y, s):
			d = c.d
			r = s * 0.3
			if kind == "fluffy":
				for ox, oy, k in ((-0.45, 0.1, 0.5), (0.45, 0.1, 0.5), (0, -0.25, 0.6), (-0.2, 0.3, 0.5), (0.25, 0.3, 0.5)):
					circle(d, x + ox * r, y + oy * r, r * k, fill=col("#f1f5f9"), outline=col("#cbd5e1"), width=max(1, s * 0.015))
			elif kind == "spiky":
				for k in range(5):
					bx = x - r + k * r * 0.5
					d.polygon([(bx - r * 0.25, y + r * 0.6), (bx, y - r * 0.7), (bx + r * 0.25, y + r * 0.6)], fill=col("#16a34a"))
			else:  # bumpy
				circle(d, x, y, r, fill=col("#a16207"))
				for k in range(7):
					a = k * 0.9
					circle(d, x + math.cos(a) * r * 0.55, y + math.sin(a) * r * 0.55, r * 0.14, fill=col("#713f12"))

		return draw

	return factory


def T_face(mood):
	return lambda c: lambda x, y, s: face(c.d, x, y, s * 0.3, mood)


# ---------------------------------------------------------------- game -> scene
SCENES = {
	"trace-walk-shapes": lambda c: scene_trace(c, "star"),
	"trace-walk-alphabet": lambda c: scene_trace(c, "letter"),
	"trace-walk-number": lambda c: scene_trace(c, "number"),
	"paint-floor": scene_paint,
	"trail-confetti": lambda c: scene_trail(c, "confetti"),
	"trail-flower-garden": lambda c: scene_trail(c, "petal"),
	"trail-ice-crystal": lambda c: scene_trail(c, "ice"),
	"trail-underwater-bubble": lambda c: scene_trail(c, "bubble-under"),
	"trail-firework": lambda c: scene_trail(c, "firework"),
	"trail-teddy-print": lambda c: scene_trail(c, "paw"),
	"trail-candy-drop": lambda c: scene_trail(c, "candy"),
	"trail-cloud-puff": lambda c: scene_trail(c, "cloud"),
	"trail-rainbow-swirl": lambda c: scene_trail(c, "rainbow-star"),
	"trail-heart": lambda c: scene_trail(c, "heart"),
	"trail-rainbow-lines": lambda c: scene_trail(c, "ribbon"),
	"trail-firefly": lambda c: scene_trail(c, "firefly"),
	"trail-glitter": lambda c: scene_trail(c, "glitter"),
	"trail-bubble": lambda c: scene_trail(c, "soap"),
	"trail-galaxy": lambda c: scene_trail(c, "galaxy"),
	"trail-magic-sparkle": lambda c: scene_trail(c, "magic"),
	"trail-ember": lambda c: scene_trail(c, "ember"),
	"trail-snow": lambda c: scene_trail(c, "snow"),
	"trail-paint": lambda c: scene_trail(c, "paint"),
	"trail-stardust": lambda c: scene_trail(c, "stardust"),
	"water-walk": scene_ripple,
	"scatter-leaf": lambda c: scene_sweep(c, "leaf"),
	"scatter-shells": lambda c: scene_sweep(c, "shell"),
	"scatter-fruit": lambda c: scene_sweep(c, "fruit"),
	"guess-fruits": lambda c: scene_reveal(c, "apple", ["Banana", "Apple", "Grapes"], 1),
	"guess-animals": lambda c: scene_reveal(c, "cat", ["Dog", "Cow", "Cat"], 2),
	"reveal-flowers": lambda c: scene_reveal(c, "flowers"),
	"reveal-birds": lambda c: scene_reveal(c, "birds"),
	"reveal-fruits": lambda c: scene_reveal(c, "fruit"),
	"reveal-vehicles": lambda c: scene_reveal(c, "vehicles"),
	"reveal-animals": lambda c: scene_reveal(c, "cat"),
	"balloon-pop": lambda c: scene_pop(c, "balloon"),
	"apple-catch": scene_catch,
	"bubble-pop": lambda c: scene_pop(c, "bubble"),
	"candy-pop": lambda c: scene_pop(c, "candy"),
	"heart-balloon-pop": lambda c: scene_pop(c, "heart"),
	"ball-pop": lambda c: scene_pop(c, "ball"),
	"emotion_recognition_ai": choose_game("Happy", [T_face("sad"), T_face("happy"), T_face("angry")], 1),
	"texture_identification": choose_game("Fluffy", [T_texture("spiky"), T_texture("bumpy"), T_texture("fluffy")], 2),
	"sound_direction_game": choose_game("Where is the sound?", [T_arrow("left"), T_arrow("both"), T_arrow("right")], 2, speaker=True),
	"yes_or_no_response_game": choose_game("Is the sun hot?", [T_text("Yes", GOOD), T_text("No", "#dc2626")], 0),
	"sentence_completion": choose_game("The cat says …", [T_text("moo"), T_text("meow"), T_text("quack")], 1),
	"ignore-distraction-game": choose_game(
		"Red circle",
		[T_shape("square", "#ef4444", distract=True), T_shape("circle", "#3b82f6", distract=True), T_shape("circle", "#ef4444", distract=True)],
		2,
		prompt_color="#dc2626",
	),
	"shape-and-size-logic": choose_game("Biggest", [T_shape("circle", "#8b5cf6", 0.6), T_shape("circle", "#8b5cf6", 0.35), T_shape("circle", "#8b5cf6", 1.15)], 2),
	"odd-one-out-category": choose_game("Odd one out", [T_draw(apple), T_draw(orange_fruit), T_draw(lambda d, x, y, r: car(d, x, y, r * 0.6)), T_draw(grapes)], 2),
	"odd-one-out-color": choose_game("Odd one out", [T_shape("square", "#3b82f6"), T_shape("square", "#3b82f6"), T_shape("square", "#f97316"), T_shape("square", "#3b82f6")], 2),
	"odd-one-out-shape": choose_game("Odd one out", [T_shape("circle", "#10b981"), T_shape("triangle", "#10b981"), T_shape("circle", "#10b981"), T_shape("circle", "#10b981")], 1),
	"smart-object-recognition": choose_game("Find the ball", [T_draw(cup), T_draw(beach_ball), T_draw(book)], 1),
	"color-reaction-step": choose_game(
		"Green!",
		[T_shape("circle", "#ef4444"), T_shape("circle", "#3b82f6"), T_shape("circle", "#22c55e"), T_shape("circle", "#facc15")],
		2,
		prompt_color=GOOD,
	),
}

STAGE_BG = {
	"trail-firework": DARK_TRAILS["firework"],
	"trail-firefly": DARK_TRAILS["firefly"],
	"trail-galaxy": DARK_TRAILS["galaxy"],
	"trail-ember": DARK_TRAILS["ember"],
	"trail-snow": TRAIL_BG["snow"],
	"trail-underwater-bubble": TRAIL_BG["bubble-under"],
	"water-walk": "#7dd3fc",
}


# ---------------------------------------------------------------- rendering
def wrap_title(title, max_w, size, lines):
	while size > 9:
		f = font(size)
		words, out, cur = title.split(), [], ""
		for word in words:
			trial = f"{cur} {word}".strip()
			if f.getlength(trial) <= max_w or not cur:
				cur = trial
			else:
				out.append(cur)
				cur = word
		out.append(cur)
		if len(out) <= lines and all(f.getlength(line) <= max_w for line in out):
			return out, size
		size -= 1
	return [title], size


def stage_background(w, h, bg, accent, dark):
	img = Image.new("RGB", (w, h), hexc(bg))
	d = ImageDraw.Draw(img, "RGBA")
	u = min(w, h)
	light = (255, 255, 255, 30 if dark else 110)
	for fx, fy, fr in ((0.06, 0.18, 0.32), (0.9, 0.12, 0.16)):
		circle(d, fx * w, fy * h, fr * u, fill=light)
	circle(d, 0.94 * w, 0.95 * h, 0.4 * u, fill=col(accent, 0.05 if dark else 0.07))
	return img


def render(game, fmt_name):
	fmt = FORMATS[fmt_name]
	ow, oh = fmt["size"]
	W, H = ow * SS, oh * SS
	th = fmt["title_h"] * SS
	sw, sh = W, H - th
	bg, accent = DOMAIN[game["primaryDomain"]]
	stage_bg = STAGE_BG.get(game["key"], bg)
	dark = sum(hexc(stage_bg)) < 300
	base = stage_background(sw, sh, stage_bg, accent, dark)

	band = Image.new("RGB", (W, th), (255, 255, 255))
	bd = ImageDraw.Draw(band)
	bd.rectangle([0, 0, W, SS * 3], fill=hexc(accent))
	lines, size = wrap_title(game["newTitle"], W - 20 * SS, fmt["font"] * SS, fmt["lines"])
	lh = size * 1.12
	y0 = th / 2 - lh * (len(lines) - 1) / 2 + SS
	for k, line in enumerate(lines):
		bd.text((W / 2, y0 + k * lh), line, font=font(size), fill=hexc(accent), anchor="mm")

	scene = SCENES[game["key"]]
	frames = []
	for i in range(N):
		stage = base.copy()
		scene(Ctx(stage, sw, sh, i / N, accent))
		canvas = Image.new("RGB", (W, H))
		canvas.paste(stage, (0, 0))
		canvas.paste(band, (0, sh))
		frames.append(canvas.resize((ow, oh), Image.LANCZOS))
	return frames


def save_gif(frames, path):
	# One shared palette, so pixels that don't change map to the same index and
	# the GIF encoder only stores the changed area of each frame.
	w, h = frames[0].size
	sample = Image.new("RGB", (w, h * 4))
	for k in range(4):
		sample.paste(frames[k * len(frames) // 4], (0, h * k))
	palette = sample.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
	pal = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
	pal[0].save(path, save_all=True, append_images=pal[1:], duration=DUR, loop=0, disposal=1, optimize=True)


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument("--only", help="comma-separated game keys")
	ap.add_argument("--sheet", help="also write review contact sheets to this directory")
	args = ap.parse_args()

	games = json.loads(CATALOG.read_text())["games"]
	missing = [g["key"] for g in games if g["key"] not in SCENES]
	if missing:
		raise SystemExit(f"No scene for: {', '.join(missing)}")
	if args.only:
		keys = set(args.only.split(","))
		games = [g for g in games if g["key"] in keys]

	OUT.mkdir(parents=True, exist_ok=True)
	sheet_frames = []
	total = 0
	for g in games:
		for fmt_name, fmt in FORMATS.items():
			frames = render(g, fmt_name)
			path = OUT / f"{g['key']}{fmt['suffix']}.gif"
			save_gif(frames, path)
			total += path.stat().st_size
			if args.sheet and fmt_name == "wide":
				sheet_frames.append([frames[N * 3 // 10], frames[N * 7 // 10]])
			if args.sheet and fmt_name == "sm":
				sheet_frames[-1].append(frames[N // 2])
		print(f"{g['key']}", flush=True)
	print(f"{len(games)} games, {total / 1024 / 1024:.1f} MB total")

	if args.sheet:
		FsPath(args.sheet).mkdir(parents=True, exist_ok=True)
		per = 9
		for s in range(0, len(sheet_frames), per):
			chunk = sheet_frames[s : s + per]
			sheet = Image.new("RGB", (240 * 2 + 80, 135 * len(chunk)), "white")
			for r, (a, b, sm) in enumerate(chunk):
				sheet.paste(a.resize((240, 135)), (0, r * 135))
				sheet.paste(b.resize((240, 135)), (240, r * 135))
				sheet.paste(sm.resize((80, 80)), (480, r * 135 + 27))
			sheet.save(FsPath(args.sheet) / f"sheet-{s // per + 1}.png")


if __name__ == "__main__":
	main()
