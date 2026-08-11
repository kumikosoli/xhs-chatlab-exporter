/* xhs-chatlab-exporter v0.4.0 — generated; edit extension-src/ */
(() => {
  // node_modules/fflate/esm/browser.js
  var u8 = Uint8Array;
  var u16 = Uint16Array;
  var i32 = Int32Array;
  var fleb = new u8([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    4,
    4,
    4,
    4,
    5,
    5,
    5,
    5,
    0,
    /* unused */
    0,
    0,
    /* impossible */
    0
  ]);
  var fdeb = new u8([
    0,
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
    /* unused */
    0,
    0
  ]);
  var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var freb = function(eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
      b[i] = start += 1 << eb[i - 1];
    }
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
      for (var j = b[i]; j < b[i + 1]; ++j) {
        r[j] = j - b[i] << 5 | i;
      }
    }
    return { b, r };
  };
  var _a = freb(fleb, 2);
  var fl = _a.b;
  var revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  var _b = freb(fdeb, 0);
  var fd = _b.b;
  var revfd = _b.r;
  var rev = new u16(32768);
  for (i = 0; i < 32768; ++i) {
    x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  var x;
  var i;
  var hMap = (function(cd, mb, r) {
    var s = cd.length;
    var i = 0;
    var l = new u16(mb);
    for (; i < s; ++i) {
      if (cd[i])
        ++l[cd[i] - 1];
    }
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
      le[i] = le[i - 1] + l[i - 1] << 1;
    }
    var co;
    if (r) {
      co = new u16(1 << mb);
      var rvb = 15 - mb;
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          var sv = i << 4 | cd[i];
          var r_1 = mb - cd[i];
          var v = le[cd[i] - 1]++ << r_1;
          for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
            co[rev[v] >> rvb] = sv;
          }
        }
      }
    } else {
      co = new u16(s);
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
        }
      }
    }
    return co;
  });
  var flt = new u8(288);
  for (i = 0; i < 144; ++i)
    flt[i] = 8;
  var i;
  for (i = 144; i < 256; ++i)
    flt[i] = 9;
  var i;
  for (i = 256; i < 280; ++i)
    flt[i] = 7;
  var i;
  for (i = 280; i < 288; ++i)
    flt[i] = 8;
  var i;
  var fdt = new u8(32);
  for (i = 0; i < 32; ++i)
    fdt[i] = 5;
  var i;
  var flm = /* @__PURE__ */ hMap(flt, 9, 0);
  var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
  var shft = function(p) {
    return (p + 7) / 8 | 0;
  };
  var slc = function(v, s, e) {
    if (s == null || s < 0)
      s = 0;
    if (e == null || e > v.length)
      e = v.length;
    return new u8(v.subarray(s, e));
  };
  var ec = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    // determined by compression function
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data"
    // determined by unknown compression method
  ];
  var err = function(ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
      Error.captureStackTrace(e, err);
    if (!nt)
      throw e;
    return e;
  };
  var wbits = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
  };
  var wbits16 = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
    d[o + 2] |= v >> 16;
  };
  var hTree = function(d, mb) {
    var t = [];
    for (var i = 0; i < d.length; ++i) {
      if (d[i])
        t.push({ s: i, f: d[i] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
      return { t: et, l: 0 };
    if (s == 1) {
      var v = new u8(t[0].s + 1);
      v[t[0].s] = 1;
      return { t: v, l: 1 };
    }
    t.sort(function(a, b) {
      return a.f - b.f;
    });
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
    t[0] = { s: -1, f: l.f + r.f, l, r };
    while (i1 != s - 1) {
      l = t[t[i0].f < t[i2].f ? i0++ : i2++];
      r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
      t[i1++] = { s: -1, f: l.f + r.f, l, r };
    }
    var maxSym = t2[0].s;
    for (var i = 1; i < s; ++i) {
      if (t2[i].s > maxSym)
        maxSym = t2[i].s;
    }
    var tr = new u16(maxSym + 1);
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
      var i = 0, dt = 0;
      var lft = mbt - mb, cst = 1 << lft;
      t2.sort(function(a, b) {
        return tr[b.s] - tr[a.s] || a.f - b.f;
      });
      for (; i < s; ++i) {
        var i2_1 = t2[i].s;
        if (tr[i2_1] > mb) {
          dt += cst - (1 << mbt - tr[i2_1]);
          tr[i2_1] = mb;
        } else
          break;
      }
      dt >>= lft;
      while (dt > 0) {
        var i2_2 = t2[i].s;
        if (tr[i2_2] < mb)
          dt -= 1 << mb - tr[i2_2]++ - 1;
        else
          ++i;
      }
      for (; i >= 0 && dt; --i) {
        var i2_3 = t2[i].s;
        if (tr[i2_3] == mb) {
          --tr[i2_3];
          ++dt;
        }
      }
      mbt = mb;
    }
    return { t: new u8(tr), l: mbt };
  };
  var ln = function(n, l, d) {
    return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
  };
  var lc = function(c) {
    var s = c.length;
    while (s && !c[--s])
      ;
    var cl = new u16(++s);
    var cli = 0, cln = c[0], cls = 1;
    var w = function(v) {
      cl[cli++] = v;
    };
    for (var i = 1; i <= s; ++i) {
      if (c[i] == cln && i != s)
        ++cls;
      else {
        if (!cln && cls > 2) {
          for (; cls > 138; cls -= 138)
            w(32754);
          if (cls > 2) {
            w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
            cls = 0;
          }
        } else if (cls > 3) {
          w(cln), --cls;
          for (; cls > 6; cls -= 6)
            w(8304);
          if (cls > 2)
            w(cls - 3 << 5 | 8208), cls = 0;
        }
        while (cls--)
          w(cln);
        cls = 1;
        cln = c[i];
      }
    }
    return { c: cl.subarray(0, cli), n: s };
  };
  var clen = function(cf, cl) {
    var l = 0;
    for (var i = 0; i < cl.length; ++i)
      l += cf[i] * cl[i];
    return l;
  };
  var wfblk = function(out, pos, dat) {
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i = 0; i < s; ++i)
      out[o + i + 4] = dat[i];
    return (o + 4 + s) * 8;
  };
  var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
    var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
    var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
    var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
    var lcfreq = new u16(19);
    for (var i = 0; i < lclt.length; ++i)
      ++lcfreq[lclt[i] & 31];
    for (var i = 0; i < lcdt.length; ++i)
      ++lcfreq[lcdt[i] & 31];
    var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
    var nlcc = 19;
    for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
      ;
    var flen = bl + 5 << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
    if (bs >= 0 && flen <= ftlen && flen <= dtlen)
      return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
      lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
      var llm = hMap(lct, mlcb, 0);
      wbits(out, p, nlc - 257);
      wbits(out, p + 5, ndc - 1);
      wbits(out, p + 10, nlcc - 4);
      p += 14;
      for (var i = 0; i < nlcc; ++i)
        wbits(out, p + 3 * i, lct[clim[i]]);
      p += 3 * nlcc;
      var lcts = [lclt, lcdt];
      for (var it = 0; it < 2; ++it) {
        var clct = lcts[it];
        for (var i = 0; i < clct.length; ++i) {
          var len = clct[i] & 31;
          wbits(out, p, llm[len]), p += lct[len];
          if (len > 15)
            wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
        }
      }
    } else {
      lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i = 0; i < li; ++i) {
      var sym = syms[i];
      if (sym > 255) {
        var len = sym >> 18 & 31;
        wbits16(out, p, lm[len + 257]), p += ll[len + 257];
        if (len > 7)
          wbits(out, p, sym >> 23 & 31), p += fleb[len];
        var dst = sym & 31;
        wbits16(out, p, dm[dst]), p += dl[dst];
        if (dst > 3)
          wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
      } else {
        wbits16(out, p, lm[sym]), p += ll[sym];
      }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
  };
  var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
  var et = /* @__PURE__ */ new u8(0);
  var dflt = function(dat, lvl, plvl, pre, post, st) {
    var s = st.z || dat.length;
    var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
    var w = o.subarray(pre, o.length - post);
    var lst = st.l;
    var pos = (st.r || 0) & 7;
    if (lvl) {
      if (pos)
        w[0] = st.r >> 3;
      var opt = deo[lvl - 1];
      var n = opt >> 13, c = opt & 8191;
      var msk_1 = (1 << plvl) - 1;
      var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
      var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
      var hsh = function(i2) {
        return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
      };
      var syms = new i32(25e3);
      var lf = new u16(288), df = new u16(32);
      var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
      for (; i + 2 < s; ++i) {
        var hv = hsh(i);
        var imod = i & 32767, pimod = head[hv];
        prev[imod] = pimod;
        head[hv] = imod;
        if (wi <= i) {
          var rem = s - i;
          if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
            pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
            li = lc_1 = eb = 0, bs = i;
            for (var j = 0; j < 286; ++j)
              lf[j] = 0;
            for (var j = 0; j < 30; ++j)
              df[j] = 0;
          }
          var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
          if (rem > 2 && hv == hsh(i - dif)) {
            var maxn = Math.min(n, rem) - 1;
            var maxd = Math.min(32767, i);
            var ml = Math.min(258, rem);
            while (dif <= maxd && --ch_1 && imod != pimod) {
              if (dat[i + l] == dat[i + l - dif]) {
                var nl = 0;
                for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                  ;
                if (nl > l) {
                  l = nl, d = dif;
                  if (nl > maxn)
                    break;
                  var mmd = Math.min(dif, nl - 2);
                  var md = 0;
                  for (var j = 0; j < mmd; ++j) {
                    var ti = i - dif + j & 32767;
                    var pti = prev[ti];
                    var cd = ti - pti & 32767;
                    if (cd > md)
                      md = cd, pimod = ti;
                  }
                }
              }
              imod = pimod, pimod = prev[imod];
              dif += imod - pimod & 32767;
            }
          }
          if (d) {
            syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
            var lin = revfl[l] & 31, din = revfd[d] & 31;
            eb += fleb[lin] + fdeb[din];
            ++lf[257 + lin];
            ++df[din];
            wi = i + l;
            ++lc_1;
          } else {
            syms[li++] = dat[i];
            ++lf[dat[i]];
          }
        }
      }
      for (i = Math.max(i, wi); i < s; ++i) {
        syms[li++] = dat[i];
        ++lf[dat[i]];
      }
      pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
      if (!lst) {
        st.r = pos & 7 | w[pos / 8 | 0] << 3;
        pos -= 7;
        st.h = head, st.p = prev, st.i = i, st.w = wi;
      }
    } else {
      for (var i = st.w || 0; i < s + lst; i += 65535) {
        var e = i + 65535;
        if (e >= s) {
          w[pos / 8 | 0] = lst;
          e = s;
        }
        pos = wfblk(w, pos + 1, dat.subarray(i, e));
      }
      st.i = s;
    }
    return slc(o, 0, pre + shft(pos) + post);
  };
  var crct = /* @__PURE__ */ (function() {
    var t = new Int32Array(256);
    for (var i = 0; i < 256; ++i) {
      var c = i, k = 9;
      while (--k)
        c = (c & 1 && -306674912) ^ c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  var crc = function() {
    var c = -1;
    return {
      p: function(d) {
        var cr = c;
        for (var i = 0; i < d.length; ++i)
          cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
        c = cr;
      },
      d: function() {
        return ~c;
      }
    };
  };
  var dopt = function(dat, opt, pre, post, st) {
    if (!st) {
      st = { l: 1 };
      if (opt.dictionary) {
        var dict = opt.dictionary.subarray(-32768);
        var newDat = new u8(dict.length + dat.length);
        newDat.set(dict);
        newDat.set(dat, dict.length);
        dat = newDat;
        st.w = dict.length;
      }
    }
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
  };
  var mrg = function(a, b) {
    var o = {};
    for (var k in a)
      o[k] = a[k];
    for (var k in b)
      o[k] = b[k];
    return o;
  };
  var wbytes = function(d, b, v) {
    for (; v; ++b)
      d[b] = v, v >>>= 8;
  };
  function deflateSync(data, opts) {
    return dopt(data, opts || {}, 0, 0);
  }
  var fltn = function(d, p, t, o) {
    for (var k in d) {
      var val = d[k], n = p + k, op = o;
      if (Array.isArray(val))
        op = mrg(o, val[1]), val = val[0];
      if (ArrayBuffer.isView(val))
        t[n] = [val, op];
      else {
        t[n += "/"] = [new u8(0), op];
        fltn(val, n, t, o);
      }
    }
  };
  var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {
  }
  function strToU8(str, latin1) {
    if (latin1) {
      var ar_1 = new u8(str.length);
      for (var i = 0; i < str.length; ++i)
        ar_1[i] = str.charCodeAt(i);
      return ar_1;
    }
    if (te)
      return te.encode(str);
    var l = str.length;
    var ar = new u8(str.length + (str.length >> 1));
    var ai = 0;
    var w = function(v) {
      ar[ai++] = v;
    };
    for (var i = 0; i < l; ++i) {
      if (ai + 5 > ar.length) {
        var n = new u8(ai + 8 + (l - i << 1));
        n.set(ar);
        ar = n;
      }
      var c = str.charCodeAt(i);
      if (c < 128 || latin1)
        w(c);
      else if (c < 2048)
        w(192 | c >> 6), w(128 | c & 63);
      else if (c > 55295 && c < 57344)
        c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
      else
        w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
    }
    return slc(ar, 0, ai);
  }
  var exfl = function(ex) {
    var le = 0;
    if (ex) {
      for (var k in ex) {
        var l = ex[k].length;
        if (l > 65535)
          err(9);
        le += l + 4;
      }
    }
    return le;
  };
  var wzh = function(d, b, f, fn, u, c, ce, co) {
    var fl2 = fn.length, ex = f.extra, col = co && co.length;
    var exl = exfl(ex);
    wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
    if (ce != null)
      d[b++] = 20, d[b++] = f.os;
    d[b] = 20, b += 2;
    d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
    d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
    var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
    if (y < 0 || y > 119)
      err(10);
    wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
    if (c != -1) {
      wbytes(d, b, f.crc);
      wbytes(d, b + 4, c < 0 ? -c - 2 : c);
      wbytes(d, b + 8, f.size);
    }
    wbytes(d, b + 12, fl2);
    wbytes(d, b + 14, exl), b += 16;
    if (ce != null) {
      wbytes(d, b, col);
      wbytes(d, b + 6, f.attrs);
      wbytes(d, b + 10, ce), b += 14;
    }
    d.set(fn, b);
    b += fl2;
    if (exl) {
      for (var k in ex) {
        var exf = ex[k], l = exf.length;
        wbytes(d, b, +k);
        wbytes(d, b + 2, l);
        d.set(exf, b + 4), b += 4 + l;
      }
    }
    if (col)
      d.set(co, b), b += col;
    return b;
  };
  var wzf = function(o, b, c, d, e) {
    wbytes(o, b, 101010256);
    wbytes(o, b + 8, c);
    wbytes(o, b + 10, c);
    wbytes(o, b + 12, d);
    wbytes(o, b + 16, e);
  };
  function zipSync(data, opts) {
    if (!opts)
      opts = {};
    var r = {};
    var files = [];
    fltn(data, "", r, opts);
    var o = 0;
    var tot = 0;
    for (var fn in r) {
      var _a2 = r[fn], file = _a2[0], p = _a2[1];
      var compression = p.level == 0 ? 0 : 8;
      var f = strToU8(fn), s = f.length;
      var com = p.comment, m = com && strToU8(com), ms = m && m.length;
      var exl = exfl(p.extra);
      if (s > 65535)
        err(11);
      var d = compression ? deflateSync(file, p) : file, l = d.length;
      var c = crc();
      c.p(file);
      files.push(mrg(p, {
        size: file.length,
        crc: c.d(),
        c: d,
        f,
        m,
        u: s != fn.length || m && com.length != ms,
        o,
        compression
      }));
      o += 30 + s + exl + l;
      tot += 76 + 2 * (s + exl) + (ms || 0) + l;
    }
    var out = new u8(tot + 22), oe = o, cdl = tot - o;
    for (var i = 0; i < files.length; ++i) {
      var f = files[i];
      wzh(out, f.o, f, f.f, f.u, f.c.length);
      var badd = 30 + f.f.length + exfl(f.extra);
      out.set(f.c, f.o + badd);
      wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
    }
    wzf(out, o, files.length, cdl, oe);
    return out;
  }

  // src/sha256.js
  var ROUND_CONSTANTS = new Uint32Array([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  function rotateRight(value, count) {
    return value >>> count | value << 32 - count;
  }
  function sha256Hex(value) {
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value instanceof Uint8Array ? value : new Uint8Array(value);
    const bitLength = bytes.length * 8;
    const paddedLength = Math.ceil((bytes.length + 1 + 8) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 128;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296));
    view.setUint32(paddedLength - 4, bitLength >>> 0);
    const hash = new Uint32Array([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    const words = new Uint32Array(64);
    for (let offset = 0; offset < paddedLength; offset += 64) {
      for (let index = 0; index < 16; index += 1) {
        words[index] = view.getUint32(offset + index * 4);
      }
      for (let index = 16; index < 64; index += 1) {
        const previous15 = words[index - 15];
        const previous2 = words[index - 2];
        const sigma0 = rotateRight(previous15, 7) ^ rotateRight(previous15, 18) ^ previous15 >>> 3;
        const sigma1 = rotateRight(previous2, 17) ^ rotateRight(previous2, 19) ^ previous2 >>> 10;
        words[index] = words[index - 16] + sigma0 + words[index - 7] + sigma1 >>> 0;
      }
      let a = hash[0];
      let b = hash[1];
      let c = hash[2];
      let d = hash[3];
      let e = hash[4];
      let f = hash[5];
      let g = hash[6];
      let h = hash[7];
      for (let index = 0; index < 64; index += 1) {
        const upperSigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        const choice = e & f ^ ~e & g;
        const temporary1 = h + upperSigma1 + choice + ROUND_CONSTANTS[index] + words[index] >>> 0;
        const upperSigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        const majority = a & b ^ a & c ^ b & c;
        const temporary2 = upperSigma0 + majority >>> 0;
        h = g;
        g = f;
        f = e;
        e = d + temporary1 >>> 0;
        d = c;
        c = b;
        b = a;
        a = temporary1 + temporary2 >>> 0;
      }
      hash[0] = hash[0] + a >>> 0;
      hash[1] = hash[1] + b >>> 0;
      hash[2] = hash[2] + c >>> 0;
      hash[3] = hash[3] + d >>> 0;
      hash[4] = hash[4] + e >>> 0;
      hash[5] = hash[5] + f >>> 0;
      hash[6] = hash[6] + g >>> 0;
      hash[7] = hash[7] + h >>> 0;
    }
    return Array.from(hash, (part) => part.toString(16).padStart(8, "0")).join("");
  }

  // src/chatlab.js
  var CHATLAB_MESSAGE_TYPES = /* @__PURE__ */ new Set([
    0,
    1,
    2,
    3,
    4,
    5,
    7,
    8,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    80,
    81,
    99
  ]);
  function validateChatLab(data) {
    const errors = [];
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return ["\u9876\u5C42\u5FC5\u987B\u662F JSON \u5BF9\u8C61"];
    }
    if (data.chatlab?.version !== "0.0.2") {
      errors.push('chatlab.version \u5FC5\u987B\u662F "0.0.2"');
    }
    if (!Number.isInteger(data.chatlab?.exportedAt)) {
      errors.push("chatlab.exportedAt \u5FC5\u987B\u662F Unix \u79D2\u7EA7\u6574\u6570\u65F6\u95F4\u6233");
    }
    if (!data.meta || typeof data.meta !== "object") {
      errors.push("\u7F3A\u5C11 meta \u5BF9\u8C61");
    } else {
      if (typeof data.meta.name !== "string" || !data.meta.name.trim()) {
        errors.push("meta.name \u4E0D\u80FD\u4E3A\u7A7A");
      }
      if (typeof data.meta.platform !== "string" || !data.meta.platform.trim()) {
        errors.push("meta.platform \u4E0D\u80FD\u4E3A\u7A7A");
      }
      if (!["private", "group"].includes(data.meta.type)) {
        errors.push('meta.type \u5FC5\u987B\u662F "private" \u6216 "group"');
      }
    }
    if (!Array.isArray(data.members)) {
      errors.push("members \u5FC5\u987B\u662F\u6570\u7EC4");
    }
    if (!Array.isArray(data.messages) || data.messages.length === 0) {
      errors.push("messages \u5FC5\u987B\u662F\u81F3\u5C11\u542B\u4E00\u6761\u6D88\u606F\u7684\u6570\u7EC4");
    }
    if (errors.length > 0) {
      return errors;
    }
    const memberIds = /* @__PURE__ */ new Set();
    data.members.forEach((member, index) => {
      const location = `members[${index}]`;
      if (typeof member?.platformId !== "string" || !member.platformId) {
        errors.push(`${location}.platformId \u4E0D\u80FD\u4E3A\u7A7A`);
      } else if (memberIds.has(member.platformId)) {
        errors.push(`${location}.platformId \u91CD\u590D\uFF1A${member.platformId}`);
      } else {
        memberIds.add(member.platformId);
      }
      if (typeof member?.accountName !== "string" || !member.accountName) {
        errors.push(`${location}.accountName \u4E0D\u80FD\u4E3A\u7A7A`);
      }
    });
    const messageIds = /* @__PURE__ */ new Set();
    let previousTimestamp = -Infinity;
    data.messages.forEach((message, index) => {
      const location = `messages[${index}]`;
      if (typeof message?.sender !== "string" || !message.sender) {
        errors.push(`${location}.sender \u4E0D\u80FD\u4E3A\u7A7A`);
      } else if (message.sender !== "SYSTEM" && !memberIds.has(message.sender)) {
        errors.push(`${location}.sender \u672A\u51FA\u73B0\u5728 members \u4E2D\uFF1A${message.sender}`);
      }
      if (typeof message?.accountName !== "string" || !message.accountName) {
        errors.push(`${location}.accountName \u4E0D\u80FD\u4E3A\u7A7A`);
      }
      if (!Number.isInteger(message?.timestamp) || message.timestamp < 0) {
        errors.push(`${location}.timestamp \u5FC5\u987B\u662F Unix \u79D2\u7EA7\u6574\u6570\u65F6\u95F4\u6233`);
      } else if (message.timestamp < previousTimestamp) {
        errors.push(`${location} \u6CA1\u6709\u6309 timestamp \u5347\u5E8F\u6392\u5217`);
      } else {
        previousTimestamp = message.timestamp;
      }
      if (!CHATLAB_MESSAGE_TYPES.has(message?.type)) {
        errors.push(`${location}.type \u4E0D\u662F ChatLab \u652F\u6301\u7684\u6D88\u606F\u7C7B\u578B`);
      }
      if (!(typeof message?.content === "string" || message?.content === null)) {
        errors.push(`${location}.content \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6216 null`);
      }
      if (typeof message?.platformMessageId !== "string" || !message.platformMessageId) {
        errors.push(`${location}.platformMessageId \u4E0D\u80FD\u4E3A\u7A7A`);
      } else if (messageIds.has(message.platformMessageId)) {
        errors.push(`${location}.platformMessageId \u91CD\u590D`);
      } else {
        messageIds.add(message.platformMessageId);
      }
    });
    return errors;
  }
  function assertValidChatLab(data) {
    const errors = validateChatLab(data);
    if (errors.length > 0) {
      throw new Error(`ChatLab JSON \u6821\u9A8C\u5931\u8D25\uFF1A
- ${errors.join("\n- ")}`);
    }
  }

  // src/time.js
  var XHS_MESSAGE_EPOCH = 0x180000000n;
  var XHS_TIMESTAMP_SHIFT = 24n;
  function decodeXhsMessageTimestamp(messageId) {
    const segment = String(messageId ?? "").split(".").at(-1);
    if (!segment || !/^[0-9a-f]+$/i.test(segment)) {
      throw new Error(`\u65E0\u6CD5\u4ECE\u6D88\u606F ID \u89E3\u7801\u65F6\u95F4\uFF1A${messageId}`);
    }
    const encoded = BigInt(`0x${segment}`);
    const timestamp = (encoded >> XHS_TIMESTAMP_SHIFT) - XHS_MESSAGE_EPOCH;
    if (timestamp < 0n || timestamp > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`\u6D88\u606F ID \u4E2D\u7684\u65F6\u95F4\u8D85\u51FA\u6709\u6548\u8303\u56F4\uFF1A${messageId}`);
    }
    return Number(timestamp);
  }

  // src/xhs.js
  function digest(value) {
    return sha256Hex(String(value)).slice(0, 20);
  }
  function avatarIdentity(avatar) {
    if (!avatar) {
      return "";
    }
    try {
      const parsed = new URL(avatar);
      return parsed.pathname.replace(/\/+$/, "").split("/").at(-1) || parsed.pathname;
    } catch {
      return avatar;
    }
  }
  function compactLines(values) {
    return values.flatMap((value) => Array.isArray(value) ? value : [value]).map((value) => String(value || "").trim()).filter(Boolean).join("\n");
  }
  function mediaItems(raw, kind) {
    return (raw.media || []).filter((item) => !kind || item.kind === kind).filter((item) => item.src || item.archivePath);
  }
  function mediaLines(raw, kind, label) {
    return mediaItems(raw, kind).flatMap((item) => [
      item.src ? `[${label}] ${item.src}` : "",
      item.archivePath ? `[\u672C\u5730\u6587\u4EF6] ${item.archivePath}` : ""
    ]);
  }
  function contentFor(raw, type) {
    const baseText = raw.text || raw.hint || "";
    if (type === 25) {
      const reference = raw.quote ? `[\u56DE\u590D ${raw.quote.sender || "\u67D0\u4EBA"}\uFF1A${raw.quote.content || ""}]` : "";
      return compactLines([baseText || raw.fallbackText, reference]) || null;
    }
    if (type === 1) {
      return compactLines([
        raw.text,
        mediaLines(raw, "image", "\u56FE\u7247")
      ]) || "[\u56FE\u7247]";
    }
    if (type === 2) {
      return compactLines([
        raw.text,
        mediaLines(raw, "audio", "\u8BED\u97F3")
      ]) || "[\u8BED\u97F3]";
    }
    if (type === 3) {
      return compactLines([
        raw.text,
        mediaLines(raw, "video", "\u89C6\u9891")
      ]) || "[\u89C6\u9891]";
    }
    if (type === 5) {
      return compactLines([
        raw.text,
        mediaItems(raw, "emoji").flatMap((item) => [
          item.src ? `[\u8868\u60C5${item.alt ? `\uFF1A${item.alt}` : ""}] ${item.src}` : "",
          item.archivePath ? `[\u672C\u5730\u6587\u4EF6] ${item.archivePath}` : ""
        ])
      ]) || "[\u8868\u60C5]";
    }
    if (type === 24 || type === 7) {
      const card = raw.card ? `[\u5C0F\u7EA2\u4E66\u7B14\u8BB0] ${raw.card.title}${raw.card.author ? ` \u2014 ${raw.card.author}` : ""}` : "";
      return compactLines([
        baseText,
        card,
        mediaLines(raw, "card-cover", "\u5C01\u9762"),
        (raw.links || []).map((url) => `[\u94FE\u63A5] ${url}`)
      ]) || "[\u5206\u4EAB]";
    }
    if (type === 80 || type === 81) {
      return raw.hint || raw.fallbackText || (type === 81 ? "[\u64A4\u56DE\u6D88\u606F]" : "[\u7CFB\u7EDF\u6D88\u606F]");
    }
    return compactLines([
      baseText || raw.fallbackText,
      (raw.media || []).flatMap((item) => [
        item.src ? `[${item.kind}] ${item.src}` : "",
        item.archivePath ? `[\u672C\u5730\u6587\u4EF6] ${item.archivePath}` : ""
      ]),
      (raw.links || []).map((url) => `[\u94FE\u63A5] ${url}`)
    ]) || `[\u5C0F\u7EA2\u4E66\u6D88\u606F\uFF1A\u539F\u7C7B\u578B ${raw.contentType || "\u672A\u77E5"}]`;
  }
  function chatLabType(raw) {
    const systemText = raw.hint || raw.fallbackText || "";
    if (raw.direction === "system" || ["4", "10"].includes(String(raw.contentType))) {
      return /撤回/.test(systemText) ? 81 : 80;
    }
    if (raw.quote) {
      return 25;
    }
    if ((raw.media || []).some((item) => item.kind === "video")) {
      return 3;
    }
    if ((raw.media || []).some((item) => item.kind === "audio")) {
      return 2;
    }
    switch (String(raw.contentType)) {
      case "1":
        return 0;
      case "2":
        return 1;
      case "3":
        return 24;
      case "13":
      case "16":
        return 5;
      default:
        return 99;
    }
  }
  function makeSenderResolver({
    conversationId,
    conversationKind,
    conversationName,
    selfName
  }) {
    let selfId = null;
    return function resolve(raw) {
      if (raw.direction === "system") {
        return {
          platformId: "SYSTEM",
          accountName: "\u7CFB\u7EDF",
          groupNickname: null,
          avatarUrl: ""
        };
      }
      if (raw.direction === "right") {
        if (!selfId) {
          const key2 = avatarIdentity(raw.avatar) || selfName;
          selfId = `xhs-user-${digest(`self:${key2}`)}`;
        }
        return {
          platformId: selfId,
          accountName: selfName,
          groupNickname: conversationKind === "group" ? selfName : null,
          avatarUrl: raw.avatar || ""
        };
      }
      if (conversationKind === "private") {
        return {
          platformId: `xhs-user-${conversationId}`,
          accountName: raw.senderName || conversationName,
          groupNickname: null,
          avatarUrl: raw.avatar || ""
        };
      }
      const name = raw.senderName || "\u672A\u77E5\u6210\u5458";
      const key = avatarIdentity(raw.avatar) || name;
      return {
        platformId: `xhs-user-${digest(`group-member:${key}`)}`,
        accountName: name,
        groupNickname: name,
        avatarUrl: raw.avatar || ""
      };
    };
  }
  function toChatLab(rawMessages, {
    conversationId,
    conversationKind,
    conversationName,
    selfName = "\u6211",
    startTimestamp = null,
    endTimestamp = null,
    includeMessageTypes = null,
    avatarDataByUrl = null,
    conversationAvatar = "",
    exportedAt = Math.floor(Date.now() / 1e3)
  }) {
    if (!["private", "group"].includes(conversationKind)) {
      throw new Error(`\u65E0\u6CD5\u8BC6\u522B\u4F1A\u8BDD\u7C7B\u578B\uFF1A${conversationKind || "\u7A7A"}`);
    }
    const resolveSender = makeSenderResolver({
      conversationId,
      conversationKind,
      conversationName,
      selfName
    });
    const includedTypes = includeMessageTypes === null ? null : new Set(includeMessageTypes);
    const seenMessageIds = /* @__PURE__ */ new Set();
    const members = /* @__PURE__ */ new Map();
    const messages = rawMessages.map((raw) => ({
      raw,
      timestamp: decodeXhsMessageTimestamp(raw.messageId)
    })).filter(({ timestamp }) => startTimestamp === null || timestamp >= startTimestamp).filter(({ timestamp }) => endTimestamp === null || timestamp <= endTimestamp).sort((left, right) => left.timestamp - right.timestamp || left.raw.sequence - right.raw.sequence).flatMap(({ raw, timestamp }) => {
      if (seenMessageIds.has(raw.messageId)) {
        return [];
      }
      seenMessageIds.add(raw.messageId);
      const sender = resolveSender(raw);
      const type = chatLabType(raw);
      if (includedTypes !== null && !includedTypes.has(type)) {
        return [];
      }
      if (sender.platformId !== "SYSTEM") {
        const member = {
          platformId: sender.platformId,
          accountName: sender.accountName
        };
        if (sender.groupNickname) {
          member.groupNickname = sender.groupNickname;
        }
        const embeddedAvatar = avatarDataByUrl?.get(sender.avatarUrl);
        if (embeddedAvatar) {
          member.avatar = embeddedAvatar;
        }
        const existing = members.get(sender.platformId);
        members.set(sender.platformId, {
          ...existing,
          ...member,
          ...member.avatar || !existing?.avatar ? {} : { avatar: existing.avatar }
        });
      }
      const message = {
        platformMessageId: raw.messageId,
        sender: sender.platformId,
        accountName: sender.accountName,
        timestamp,
        type,
        content: contentFor(raw, type)
      };
      if (sender.groupNickname) {
        message.groupNickname = sender.groupNickname;
      }
      return [message];
    });
    if (messages.length === 0) {
      throw new Error("\u6240\u9009\u65F6\u95F4\u8303\u56F4\u5185\u6CA1\u6709\u6D88\u606F\uFF1B\u672A\u751F\u6210\u7A7A\u7684 ChatLab \u6587\u4EF6");
    }
    const meta = {
      name: conversationName || conversationId,
      platform: "xiaohongshu",
      type: conversationKind
    };
    if (conversationKind === "group") {
      meta.groupId = String(conversationId);
      const embeddedGroupAvatar = avatarDataByUrl?.get(conversationAvatar);
      if (embeddedGroupAvatar) {
        meta.groupAvatar = embeddedGroupAvatar;
      }
    }
    const result = {
      chatlab: {
        version: "0.0.2",
        exportedAt,
        generator: "xhs-chatlab-exporter/0.4.0"
      },
      meta,
      members: Array.from(members.values()),
      messages
    };
    assertValidChatLab(result);
    return result;
  }

  // extension-src/archive.js
  var MIME_EXTENSIONS = /* @__PURE__ */ new Map([
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/gif", ".gif"],
    ["image/webp", ".webp"],
    ["image/avif", ".avif"],
    ["video/mp4", ".mp4"],
    ["video/webm", ".webm"],
    ["audio/mpeg", ".mp3"],
    ["audio/mp4", ".m4a"],
    ["audio/ogg", ".ogg"],
    ["audio/wav", ".wav"]
  ]);
  var MAX_AVATAR_BYTES = 5 * 1024 * 1024;
  var MAX_MEDIA_BYTES = 200 * 1024 * 1024;
  var MAX_ARCHIVE_BYTES = 768 * 1024 * 1024;
  function safeFilenamePart(value) {
    const cleaned = String(value || "").normalize("NFKC").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[.-]+|[.-]+$/g, "").slice(0, 80);
    return cleaned || "conversation";
  }
  function normalizedMimeType(value) {
    return String(value || "").split(";")[0].trim().toLocaleLowerCase();
  }
  function sniffMimeType(bytes, declaredType, sourceUrl) {
    const declared = normalizedMimeType(declaredType);
    if (MIME_EXTENSIONS.has(declared)) {
      return declared;
    }
    if (bytes.length >= 12) {
      if (bytes[0] === 255 && bytes[1] === 216) {
        return "image/jpeg";
      }
      if (bytes[0] === 137 && String.fromCharCode(...bytes.slice(1, 4)) === "PNG") {
        return "image/png";
      }
      if (String.fromCharCode(...bytes.slice(0, 3)) === "GIF") {
        return "image/gif";
      }
      if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
        return "image/webp";
      }
      if (String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
        return declared.startsWith("audio/") ? "audio/mp4" : "video/mp4";
      }
    }
    try {
      const extension = new URL(sourceUrl).pathname.split(".").at(-1)?.toLocaleLowerCase();
      for (const [mimeType, candidate] of MIME_EXTENSIONS) {
        if (candidate.slice(1) === extension) {
          return mimeType;
        }
      }
    } catch {
    }
    return declared || "application/octet-stream";
  }
  async function readWithLimit(response, maxBytes) {
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) {
      throw new Error(`\u8D44\u6E90\u8D85\u8FC7\u5927\u5C0F\u9650\u5236\uFF08${declaredLength} bytes\uFF09`);
    }
    if (!response.body) {
      const bytes2 = new Uint8Array(await response.arrayBuffer());
      if (bytes2.length > maxBytes) {
        throw new Error(`\u8D44\u6E90\u8D85\u8FC7\u5927\u5C0F\u9650\u5236\uFF08>${maxBytes} bytes\uFF09`);
      }
      return bytes2;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`\u8D44\u6E90\u8D85\u8FC7\u5927\u5C0F\u9650\u5236\uFF08>${maxBytes} bytes\uFF09`);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }
  async function fetchAsset(sourceUrl, maxBytes) {
    let parsed;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      throw new Error("\u8D44\u6E90 URL \u65E0\u6548");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`\u4E0D\u652F\u6301\u7684\u8D44\u6E90\u534F\u8BAE\uFF1A${parsed.protocol}`);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3e4);
    try {
      const response = await fetch(parsed.href, {
        credentials: "omit",
        redirect: "follow",
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`\u4E0B\u8F7D\u5931\u8D25\uFF08HTTP ${response.status}\uFF09`);
      }
      const bytes = await readWithLimit(response, maxBytes);
      if (bytes.length === 0) {
        throw new Error("\u8D44\u6E90\u5185\u5BB9\u4E3A\u7A7A");
      }
      const contentType = sniffMimeType(
        bytes,
        response.headers.get("content-type"),
        parsed.href
      );
      return {
        bytes,
        contentType,
        extension: MIME_EXTENSIONS.get(contentType) || ".bin",
        sha256: sha256Hex(bytes)
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  async function mapConcurrent(items, concurrency, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;
    async function runWorker() {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }
    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, Math.max(1, items.length)) },
        () => runWorker()
      )
    );
    return results;
  }
  function bytesToDataUrl(bytes, contentType) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  }
  async function embedAvatars(rawMessages, conversationAvatar, onProgress) {
    const urls = Array.from(
      new Set([
        conversationAvatar,
        ...rawMessages.map((message) => message.avatar)
      ].filter(Boolean))
    );
    let completed = 0;
    const results = await mapConcurrent(urls, 5, async (sourceUrl) => {
      try {
        const asset = await fetchAsset(sourceUrl, MAX_AVATAR_BYTES);
        if (!asset.contentType.startsWith("image/")) {
          throw new Error(`\u5934\u50CF\u4E0D\u662F\u56FE\u7247\uFF08${asset.contentType}\uFF09`);
        }
        return {
          sourceUrl,
          dataUrl: bytesToDataUrl(asset.bytes, asset.contentType),
          error: null
        };
      } catch (error) {
        return { sourceUrl, dataUrl: null, error: error.message };
      } finally {
        completed += 1;
        onProgress({
          stage: "embedding-avatars",
          detail: `\u5934\u50CF ${completed}/${urls.length}`,
          progress: { completed, total: urls.length }
        });
      }
    });
    const dataByUrl = new Map(
      results.filter((item) => item.dataUrl).map((item) => [item.sourceUrl, item.dataUrl])
    );
    return {
      dataByUrl,
      total: urls.length,
      embedded: dataByUrl.size,
      failed: results.length - dataByUrl.size
    };
  }
  function folderForKind(kind) {
    switch (kind) {
      case "emoji":
        return "stickers";
      case "card-cover":
        return "card-covers";
      case "video":
        return "videos";
      case "audio":
        return "audio";
      default:
        return "images";
    }
  }
  function collectMedia(rawMessages) {
    const assets = /* @__PURE__ */ new Map();
    for (const message of rawMessages) {
      for (const media of message.media || []) {
        if (!media.src) {
          continue;
        }
        const existing = assets.get(media.src);
        if (existing) {
          existing.messageIds.add(message.messageId);
        } else {
          assets.set(media.src, {
            sourceUrl: media.src,
            kind: media.kind || "image",
            alt: media.alt || "",
            messageIds: /* @__PURE__ */ new Set([message.messageId])
          });
        }
      }
    }
    return Array.from(assets.values());
  }
  async function downloadMedia(rawMessages, onProgress) {
    const assets = collectMedia(rawMessages);
    let completed = 0;
    let totalBytes = 0;
    const results = await mapConcurrent(assets, 4, async (item) => {
      try {
        const asset = await fetchAsset(item.sourceUrl, MAX_MEDIA_BYTES);
        totalBytes += asset.bytes.length;
        if (totalBytes > MAX_ARCHIVE_BYTES) {
          throw new Error("\u5F52\u6863\u5A92\u4F53\u603B\u91CF\u8D85\u8FC7 768 MiB \u7684\u6D4F\u89C8\u5668\u5185\u5B58\u5B89\u5168\u9650\u5236");
        }
        const folder = folderForKind(item.kind);
        const filename = `${sha256Hex(item.sourceUrl).slice(0, 24)}${asset.extension}`;
        return {
          originalUrl: item.sourceUrl,
          localPath: `media/${folder}/${filename}`,
          kind: item.kind,
          alt: item.alt,
          contentType: asset.contentType,
          size: asset.bytes.length,
          sha256: asset.sha256,
          messageIds: Array.from(item.messageIds),
          bytes: asset.bytes,
          error: null
        };
      } catch (error) {
        return {
          originalUrl: item.sourceUrl,
          localPath: null,
          kind: item.kind,
          alt: item.alt,
          messageIds: Array.from(item.messageIds),
          bytes: null,
          error: error.message
        };
      } finally {
        completed += 1;
        onProgress({
          stage: "downloading-media",
          detail: `\u5A92\u4F53 ${completed}/${assets.length}`,
          progress: { completed, total: assets.length }
        });
      }
    });
    const succeeded = results.filter((item) => item.localPath);
    const failures = results.filter((item) => item.error);
    return {
      files: new Map(succeeded.map((item) => [item.localPath, item.bytes])),
      localPathByUrl: new Map(
        succeeded.map((item) => [item.originalUrl, item.localPath])
      ),
      manifest: {
        version: 1,
        generatedAt: Math.floor(Date.now() / 1e3),
        summary: {
          total: results.length,
          downloaded: succeeded.length,
          failed: failures.length,
          totalBytes: succeeded.reduce((sum, item) => sum + item.size, 0)
        },
        assets: succeeded.map(({ bytes: _bytes, error: _error, ...item }) => item),
        failures: failures.map(({ bytes: _bytes, ...item }) => item)
      }
    };
  }
  function attachMediaPaths(rawMessages, localPathByUrl) {
    return rawMessages.map((message) => ({
      ...message,
      media: (message.media || []).map((media) => ({
        ...media,
        archivePath: localPathByUrl.get(media.src) || null
      }))
    }));
  }
  function resultSummary(chatLab, filename, blob, mediaResult) {
    const embeddedAvatarCount = chatLab.members.filter((member) => member.avatar?.startsWith("data:image/")).length + (chatLab.meta.groupAvatar?.startsWith("data:image/") ? 1 : 0);
    return {
      filename,
      packageType: mediaResult ? "zip" : "json",
      fileSize: blob.size,
      messageCount: chatLab.messages.length,
      memberCount: chatLab.members.length,
      firstTimestamp: chatLab.messages[0].timestamp,
      lastTimestamp: chatLab.messages.at(-1).timestamp,
      embeddedAvatarCount,
      media: mediaResult?.manifest.summary || null
    };
  }
  async function buildExportArtifact(payload, onProgress = () => {
  }) {
    const transformOptions = {
      conversationId: payload.conversationId,
      conversationKind: payload.conversationKind,
      conversationName: payload.conversationName,
      selfName: payload.selfName,
      startTimestamp: payload.startTimestamp,
      endTimestamp: payload.endTimestamp,
      includeMessageTypes: payload.includeMessageTypes,
      conversationAvatar: payload.conversationAvatar
    };
    const preview = toChatLab(payload.rawMessages, transformOptions);
    const selectedIds = new Set(
      preview.messages.map((message) => message.platformMessageId)
    );
    const selectedRawMessages = payload.rawMessages.filter(
      (message) => selectedIds.has(message.messageId)
    );
    let avatarResult = null;
    if (payload.embedAvatars) {
      avatarResult = await embedAvatars(
        selectedRawMessages,
        payload.conversationAvatar,
        onProgress
      );
    }
    let mediaResult = null;
    let preparedMessages = payload.rawMessages;
    if (payload.downloadMedia) {
      mediaResult = await downloadMedia(selectedRawMessages, onProgress);
      preparedMessages = attachMediaPaths(
        payload.rawMessages,
        mediaResult.localPathByUrl
      );
    }
    const chatLab = toChatLab(preparedMessages, {
      ...transformOptions,
      avatarDataByUrl: avatarResult?.dataByUrl || null
    });
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const baseName = `xiaohongshu-${safeFilenamePart(payload.conversationName)}-${timestamp}`;
    const jsonText = `${JSON.stringify(chatLab, null, 2)}
`;
    if (!mediaResult) {
      const filename2 = `${baseName}.chatlab.json`;
      const blob2 = new Blob([jsonText], { type: "application/json" });
      return {
        blob: blob2,
        result: resultSummary(chatLab, filename2, blob2, null)
      };
    }
    onProgress({ stage: "packaging", detail: "\u6B63\u5728\u751F\u6210 ZIP\u2026", progress: null });
    const root = baseName;
    const files = {
      [`${root}/chatlab.json`]: strToU8(jsonText),
      [`${root}/README.txt`]: strToU8(
        [
          "\u5C0F\u7EA2\u4E66\u804A\u5929\u672C\u5730\u5F52\u6863\uFF08Chrome / Edge \u6269\u5C55\uFF09",
          "",
          "chatlab.json        ChatLab v0.0.2 \u804A\u5929\u8BB0\u5F55",
          "media/              \u4E0B\u8F7D\u6210\u529F\u7684\u56FE\u7247\u3001\u8868\u60C5\u3001\u5361\u7247\u5C01\u9762\u548C\u97F3\u89C6\u9891",
          "media/manifest.json \u539F\u59CB URL\u3001\u672C\u5730\u8DEF\u5F84\u3001\u6587\u4EF6\u54C8\u5E0C\u4E0E\u5931\u8D25\u8BB0\u5F55",
          "",
          "\u6240\u6709\u6570\u636E\u5747\u5728\u672C\u673A\u6D4F\u89C8\u5668\u4E2D\u5904\u7406\u3002\u8BF7\u59A5\u5584\u4FDD\u7BA1\u79C1\u4EBA\u804A\u5929\u5185\u5BB9\u3002"
        ].join("\n")
      ),
      [`${root}/media/manifest.json`]: strToU8(
        `${JSON.stringify(mediaResult.manifest, null, 2)}
`
      )
    };
    for (const [localPath, bytes] of mediaResult.files) {
      files[`${root}/${localPath}`] = bytes;
    }
    const zipBytes = zipSync(files, { level: 0 });
    const filename = `${baseName}.zip`;
    const blob = new Blob([zipBytes], { type: "application/zip" });
    return {
      blob,
      result: resultSummary(chatLab, filename, blob, mediaResult)
    };
  }

  // extension-src/offscreen.js
  var CHANNEL = "xhs-chatlab-exporter";
  var activeJobs = /* @__PURE__ */ new Set();
  var objectUrls = /* @__PURE__ */ new Set();
  async function report(message) {
    try {
      await chrome.runtime.sendMessage({ channel: CHANNEL, ...message });
    } catch {
    }
  }
  async function runBuild(message) {
    if (activeJobs.has(message.jobId)) {
      return;
    }
    activeJobs.add(message.jobId);
    try {
      const artifact = await buildExportArtifact(message.payload, (progress) => {
        void report({
          type: "OFFSCREEN_PROGRESS",
          tabId: message.tabId,
          jobId: message.jobId,
          ...progress
        });
      });
      const objectUrl = URL.createObjectURL(artifact.blob);
      objectUrls.add(objectUrl);
      await report({
        type: "OFFSCREEN_COMPLETE",
        tabId: message.tabId,
        jobId: message.jobId,
        objectUrl,
        result: artifact.result
      });
    } catch (error) {
      await report({
        type: "OFFSCREEN_FAILED",
        tabId: message.tabId,
        jobId: message.jobId,
        error: error.message
      });
    } finally {
      activeJobs.delete(message.jobId);
    }
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.channel !== CHANNEL) {
      return false;
    }
    if (message.type === "OFFSCREEN_BUILD_EXPORT") {
      void runBuild(message);
      sendResponse({ accepted: true });
      return false;
    }
    if (message.type === "REVOKE_OBJECT_URL" && objectUrls.has(message.objectUrl)) {
      URL.revokeObjectURL(message.objectUrl);
      objectUrls.delete(message.objectUrl);
      sendResponse({ revoked: true });
      return false;
    }
    return false;
  });
})();
