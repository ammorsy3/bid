import { useState } from "react";
import { Link, useLocation } from "wouter";
import "./landing.css";
import { BidLogo, BidMonogram } from "@/components/brand/BidLogo";
import { useAuthStore } from "@/lib/auth";

function SignUpModal({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div className="modal-icon">
          <BidMonogram variant="onInk" size={56} />
        </div>

        <h2 className="modal-headline">Source top vendors. Win top clients.</h2>

        <button
          className="modal-btn"
          onClick={() => { onClose(); navigate("/login?redirect=%2Ftenders%2Fnew%2Fai"); }}
        >
          Log in
        </button>

        <button
          className="modal-btn primary"
          onClick={() => { onClose(); navigate("/signup?redirect=%2Ftenders%2Fnew%2Fai"); }}
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}

const Landing = () => {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuthStore();

  const handleCreate = () => {
    setShowModal(true);
  };

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ background: "var(--cream)" }}>
      {showModal && <SignUpModal onClose={() => setShowModal(false)} />}
      <div className="page">

        {/* ===== TOPBAR ===== */}
        <div className="topbar">
          <a href="/" style={{ textDecoration: "none" }}>
            <BidLogo variant="orange" size={28} />
          </a>
          <nav>
            <a href="#rfp" onClick={scrollTo("rfp")}>About Bid</a>
            <Link href="/marketplace">Marketplace</Link>
            <a href="#traction" onClick={scrollTo("traction")}>Traction Link</a>
            <a href="#vendors" onClick={scrollTo("vendors")}>For Vendors</a>
          </nav>
          <div className="right">
            {user ? (
              <Link href="/dashboard">
                <button className="btn btn-primary">Dashboard</button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <button className="btn btn-ghost">Sign in</button>
                </Link>
                <Link href="/signup">
                  <button className="btn btn-primary">
                    <span className="arrow">Create an Account→</span>
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ===== HERO ===== */}
        <section className="hero" id="hero">
          <span className="badge"><span className="d"></span>Now live</span>
          <h1>Sourcing<br />Redefined<span className="accent" style={{ color: "var(--orange)" }}>.</span></h1>
          <p className="sub">Brief, Invite, Receive, Award Pre-Verified Vendors.</p>

          <div className="ctas">
            <button className="btn btn-primary" onClick={handleCreate}>Try Bid&nbsp;→</button>
            <Link href="/login">
              <button className="btn btn-ghost">Sign in</button>
            </Link>
          </div>

          {/* Floating decorations */}
          <div className="hero-deco">
            <div className="piece" style={{ top: "24%", left: "5%", "--r": "-7deg", transform: "rotate(-7deg)" } as React.CSSProperties}>
              <div style={{ background: "white", borderRadius: 12, padding: "10px 12px", width: 170, boxShadow: "0 14px 28px -10px rgba(11,9,7,.18)", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ height: 6, width: "50%", background: "var(--ink)", borderRadius: 3 }}></div>
                  <div style={{ background: "var(--orange)", color: "white", fontSize: 9, fontWeight: 700, padding: "3px 7px", borderRadius: 4 }}>RFP</div>
                </div>
                <div style={{ height: 5, width: "80%", background: "linear-gradient(90deg,var(--peach-deep),var(--peach))", borderRadius: 3 }}></div>
                <div style={{ height: 5, width: "60%", background: "linear-gradient(90deg,var(--peach-deep),var(--peach))", borderRadius: 3 }}></div>
                <div style={{ alignSelf: "flex-end", background: "var(--orange)", color: "white", fontSize: 9, fontWeight: 600, padding: "4px 9px", borderRadius: 5, marginTop: 2 }}>Publish</div>
              </div>
            </div>
            <div className="piece" style={{ top: "14%", right: "7%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".6s" } as React.CSSProperties}>
              <div style={{ background: "white", borderRadius: 100, padding: "6px 8px", display: "inline-flex", alignItems: "center", gap: 4, boxShadow: "0 14px 28px -10px rgba(11,9,7,.16)" }}>
                {["var(--orange)", "var(--yellow)", "var(--blue)"].map((bg, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: bg, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", color: bg === "var(--yellow)" ? "var(--ink)" : "white", marginLeft: i === 0 ? 0 : -10 }}>
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z" /></svg>
                  </div>
                ))}
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", padding: "0 8px 0 4px" }}>+27</span>
              </div>
            </div>
            <div className="piece" style={{ top: "58%", left: "9%", "--r": "4deg", transform: "rotate(4deg)", animationDelay: "1.3s" } as React.CSSProperties}>
              <div style={{ background: "var(--green)", color: "white", borderRadius: 100, padding: "9px 16px 9px 12px", fontSize: 13, fontWeight: 600, boxShadow: "0 14px 28px -10px rgba(34,197,94,.5)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "white", color: "var(--green)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>✓</span>
                Awarded
              </div>
            </div>
            <div className="piece" style={{ top: "50%", right: "5%", "--r": "-12deg", transform: "rotate(-12deg)", animationDelay: ".9s" } as React.CSSProperties}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--orange)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, textAlign: "center", lineHeight: 1.1, letterSpacing: ".04em", textTransform: "uppercase", boxShadow: "0 14px 28px -10px rgba(254,60,1,.5)" }}>
                Pre‑<br />Awarded<br />PO
              </div>
            </div>
            <div className="piece" style={{ bottom: "8%", right: "14%", "--r": "6deg", transform: "rotate(6deg)", animationDelay: "2.1s" } as React.CSSProperties}>
              <div style={{ background: "var(--ink)", color: "white", borderRadius: 100, padding: "8px 14px 8px 10px", fontSize: 13, fontWeight: 600, boxShadow: "0 14px 28px -10px rgba(11,9,7,.4)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--orange)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M12 0l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" /></svg>
                </span>
                AI drafted
              </div>
            </div>
          </div>

        </section>

        {/* ===== FOR REQUESTERS BANNER ===== */}
        <section id="requesters" className="vendors-section">
          <div className="vendors-hero">
            <div className="bg-dots"></div>
            <h2>For Requesters<span className="dot-end">.</span></h2>
          </div>
        </section>

        {/* ===== FEATURES ===== */}

        {/* Feature 01 · RFP Crafting */}
        <section id="rfp">
          <div className="sec-head">
            <div>
              <div className="num">01</div>
              <h2>RFP Crafting<span className="dot-end">.</span></h2>
            </div>
          </div>
          <div className="stages s3">
            <div className="stage">
              <div className="visual">
                <span className="ico" style={{ top: 4, left: "6%", "--r": "-6deg", transform: "rotate(-6deg)" } as React.CSSProperties}><span className="dot" style={{ background: "var(--orange)" }}>AI</span>AI assist</span>
                <span className="ico solid" style={{ top: 0, right: "4%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".4s" } as React.CSSProperties}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L13 9L20 10L13 11L12 18L11 11L4 10L11 9Z" /></svg>
                  In seconds
                </span>
                <span className="ico" style={{ bottom: 6, left: "10%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: ".8s" } as React.CSSProperties}>
                  <span className="dot" style={{ background: "var(--ink)" }}><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><rect x="9" y="2" width="6" height="14" rx="3" /><path d="M5 11v1a7 7 0 0014 0v-1" stroke="white" strokeWidth="2" fill="none" /></svg></span>Voice brief
                </span>
                <div className="mock-brief" style={{ marginTop: 30 }}>
                  <div className="top"><div className="title-bar"></div><div className="badge">RFP</div></div>
                  <div className="line w70"></div><div className="line w55"></div><div className="line w40"></div>
                  <div className="bottom"><div className="gray"></div><div className="btn-mini">Publish</div></div>
                  <div className="sparkle"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" /><circle cx="20" cy="4" r="1.5" /><circle cx="4" cy="20" r="1" /></svg></div>
                </div>
              </div>
              <div className="footer"><h3>Create your brief.</h3><div className="arrow-pill">→</div></div>
            </div>
            <div className="stage">
              <div className="visual">
                <span className="ico" style={{ top: 0, left: "4%", "--r": "-7deg", transform: "rotate(-7deg)", animationDelay: ".2s" } as React.CSSProperties}><span className="dot" style={{ background: "#25D366" }}>W</span>WhatsApp</span>
                <span className="ico" style={{ top: 8, right: "2%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".6s" } as React.CSSProperties}><span className="dot" style={{ background: "#EA4335" }}>G</span>Gmail</span>
                <span className="ico solid" style={{ bottom: 8, left: "8%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: "1s" } as React.CSSProperties}>One click</span>
                <span className="ico orange" style={{ bottom: 0, right: "8%", "--r": "4deg", transform: "rotate(4deg)", animationDelay: "1.4s" } as React.CSSProperties}>Vendors base</span>
                <div className="mock-invite" style={{ marginTop: 34 }}>
                  <div className="avatars">
                    {["o", "y", "b"].map((cls, i) => (
                      <div key={i} className={`av ${cls}`}><svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z" /></svg></div>
                    ))}
                    <div className="av plus">+</div>
                  </div>
                  <div className="link-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 14l4-4m-3-3l1-1a4 4 0 015 5l-1 1m-6 6l-1 1a4 4 0 01-5-5l1-1" /></svg>
                    bidapp.sa/invite/acme-corp
                  </div>
                </div>
              </div>
              <div className="footer"><h3>Invite your vendors.</h3><div className="arrow-pill">→</div></div>
            </div>
            <div className="stage">
              <div className="visual">
                <span className="ico orange" style={{ top: 0, left: "6%", "--r": "-4deg", transform: "rotate(-4deg)", animationDelay: ".3s" } as React.CSSProperties}>From the best</span>
                <span className="ico" style={{ top: 10, right: "4%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".7s" } as React.CSSProperties}><span className="dot" style={{ background: "var(--green)" }}>✓</span>Verified</span>
                <span className="ico solid" style={{ bottom: 4, left: "10%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: "1.1s" } as React.CSSProperties}>Ranked</span>
                <div className="mock-proposals" style={{ marginTop: 36 }}>
                  {[{ cls: "a", color: "var(--orange)", price: "$48k" }, { cls: "b", color: "var(--blue)", price: "$52k" }, { cls: "c", color: "var(--yellow)", price: "$44k" }].map((p) => (
                    <div key={p.cls} className={`pcard ${p.cls}`}>
                      <div className="l"><div className="av-mini" style={{ background: p.color }}></div><div className="name"></div></div>
                      <div className="price">{p.price}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="footer"><h3>Receive proposals, ranked.</h3><div className="arrow-pill" style={{ background: "var(--orange)" }}>✓</div></div>
            </div>
          </div>
          <div className="takeaway">
            <div className="quote">One clear brief. No meetings. <span className="accent">Multiple proposals.</span></div>
            <div className="stat"><div className="v">72 hrs</div><div className="k">Brief → proposals</div></div>
          </div>
        </section>

        {/* Feature 02 · Bid Tenders Marketplace */}
        <section id="marketplace">
          <div className="sec-head">
            <div><div className="num">02</div><h2>Bid Tenders Marketplace.</h2></div>
          </div>
          <div className="stages s4">
            <div className="stage">
              <div className="visual">
                <span className="ico" style={{ top: 0, left: "6%", "--r": "-6deg", transform: "rotate(-6deg)" } as React.CSSProperties}><span className="dot" style={{ background: "var(--orange)" }}>⚙</span>Customisable</span>
                <span className="ico solid" style={{ top: 8, right: "2%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".5s" } as React.CSSProperties}>Depth slider</span>
                <span className="ico orange" style={{ bottom: 6, left: "8%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: "1s" } as React.CSSProperties}>Public mode</span>
                <div className="mock-rfpform" style={{ marginTop: 34 }}>
                  <div className="row"><div className="label-tab">DEPTH</div><div className="toggle"><div className="t on"></div><div className="t on"></div><div className="t on"></div><div className="t"></div></div></div>
                  <div className="slider"><span></span><em></em></div>
                  <div className="line" style={{ width: "80%" }}></div><div className="line" style={{ width: "55%" }}></div>
                </div>
              </div>
              <div className="footer"><h3>Craft the RFP.</h3><div className="arrow-pill">→</div></div>
            </div>
            <div className="stage">
              <div className="visual">
                <span className="ico orange" style={{ top: 4, left: "4%", "--r": "-5deg", transform: "rotate(-5deg)", animationDelay: ".3s" } as React.CSSProperties}>Pre‑awarding</span>
                <span className="ico" style={{ top: 0, right: "6%", "--r": "6deg", transform: "rotate(6deg)", animationDelay: ".7s" } as React.CSSProperties}><span className="dot" style={{ background: "var(--green)" }}>✓</span>Budgeted</span>
                <span className="ico solid" style={{ bottom: 4, left: "14%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: "1.1s" } as React.CSSProperties}>Gain trust</span>
                <div className="mock-po" style={{ marginTop: 36 }}>
                  <div className="head"><div className="l">PURCHASE ORDER<br />PO‑0084</div></div>
                  <div className="amount">$120,000</div>
                  <div className="lines"><div className="l"></div><div className="l" style={{ width: "70%" }}></div></div>
                  <div className="stamp">Pre‑<br />Awarded</div>
                </div>
              </div>
              <div className="footer"><h3>Attach the PO.</h3><div className="arrow-pill">→</div></div>
            </div>
            <div className="stage">
              <div className="visual">
                <span className="ico" style={{ top: 0, left: "6%", "--r": "-5deg", transform: "rotate(-5deg)", animationDelay: ".4s" } as React.CSSProperties}><span className="dot" style={{ background: "var(--orange)" }}>📡</span>Reach new</span>
                <span className="ico solid" style={{ top: 8, right: "4%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".8s" } as React.CSSProperties}>Discoverable</span>
                <span className="ico orange" style={{ bottom: 6, left: "12%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: "1.2s" } as React.CSSProperties}>Category match</span>
                <div className="mock-feed" style={{ marginTop: 36 }}>
                  {[0, 1, 2, 3].map((i) => (<div key={i} className="item"><div className="swatch"></div><div className="l"></div><div className="l short"></div></div>))}
                </div>
              </div>
              <div className="footer"><h3>Publish to marketplace.</h3><div className="arrow-pill">→</div></div>
            </div>
            <div className="stage">
              <div className="visual">
                <span className="ico orange" style={{ top: 0, left: "6%", "--r": "-4deg", transform: "rotate(-4deg)", animationDelay: ".5s" } as React.CSSProperties}>From the best</span>
                <span className="ico" style={{ top: 10, right: "4%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".9s" } as React.CSSProperties}><span className="dot" style={{ background: "var(--green)" }}>✓</span>Verified</span>
                <span className="ico solid" style={{ bottom: 4, left: "10%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: "1.3s" } as React.CSSProperties}>Ranked</span>
                <div className="mock-rank" style={{ marginTop: 36 }}>
                  {[{ rk: "01", color: "var(--orange)", pct: "96%" }, { rk: "02", color: "var(--blue)", pct: "88%" }, { rk: "03", color: "var(--yellow)", pct: "82%" }].map((r) => (
                    <div key={r.rk} className="row">
                      <div className="rk">{r.rk}</div>
                      <div className="av" style={{ background: r.color }}></div>
                      <div className="nm" style={{ flex: 1, height: 5, background: "#EFE9DE", borderRadius: 3 }}></div>
                      <div className="pct" style={{ fontSize: 11, fontWeight: 700, color: "var(--orange)" }}>{r.pct}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="footer"><h3>Receive proposals, ranked.</h3><div className="arrow-pill" style={{ background: "var(--orange)" }}>✓</div></div>
            </div>
          </div>
          <div className="takeaway">
            <div className="quote">Real intent. New vendors. <span className="accent">Proposals from the best.</span></div>
            <div className="stat"><div className="v">~38</div><div className="k">New vendors / tender</div></div>
          </div>
        </section>

        {/* Feature 03 · Traction Link */}
        <section id="traction">
          <div className="sec-head">
            <div><div className="num">03</div><h2>Traction Link<span className="dot-end">.</span></h2></div>
          </div>
          <div className="stages s3">
            <div className="stage">
              <div className="visual">
                <span className="ico" style={{ top: 0, left: "8%", "--r": "-5deg", transform: "rotate(-5deg)", animationDelay: ".2s" } as React.CSSProperties}><span className="dot" style={{ background: "var(--orange)" }}>🔗</span>Your link</span>
                <span className="ico solid" style={{ top: 10, right: "4%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".6s" } as React.CSSProperties}>Website</span>
                <span className="ico orange" style={{ bottom: 6, left: "10%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: "1s" } as React.CSSProperties}>Bio · Email</span>
                <div className="mock-tlink" style={{ marginTop: 36 }}>
                  <div className="url-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 14l4-4m-3-3l1-1a4 4 0 015 5l-1 1m-6 6l-1 1a4 4 0 01-5-5l1-1" /></svg>
                    bidapp.sa/yourbrand
                    <span className="copy">COPY</span>
                  </div>
                  <div className="row-mini"><div className="label">Requests this week</div><div className="stat">+12</div></div>
                </div>
              </div>
              <div className="footer"><h3>Vendors request to join.</h3><div className="arrow-pill">→</div></div>
            </div>
            <div className="stage">
              <div className="visual">
                <span className="ico" style={{ top: 0, left: "8%", "--r": "-5deg", transform: "rotate(-5deg)", animationDelay: ".3s" } as React.CSSProperties}><span className="dot" style={{ background: "var(--green)" }}>+</span>Approved</span>
                <span className="ico solid" style={{ top: 12, right: "6%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".7s" } as React.CSSProperties}>Tagged</span>
                <span className="ico orange" style={{ bottom: 0, left: "6%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: "1.1s" } as React.CSSProperties}>Category</span>
                <div className="mock-grow" style={{ marginTop: 38 }}>
                  <div className="ring row-a">{[0,1,2].map(i=><div key={i} className="av"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg></div>)}</div>
                  <div className="ring row-b">{[0,1,2,3,4].map(i=><div key={i} className="av"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg></div>)}</div>
                  <span className="badge-pill"><span className="d"></span>Network +27</span>
                </div>
              </div>
              <div className="footer"><h3>Expand your network.</h3><div className="arrow-pill">→</div></div>
            </div>
            <div className="stage">
              <div className="visual">
                <span className="ico" style={{ top: 0, left: "6%", "--r": "-5deg", transform: "rotate(-5deg)", animationDelay: ".4s" } as React.CSSProperties}><span className="dot" style={{ background: "var(--ink)" }}>↗</span>Next RFP</span>
                <span className="ico orange" style={{ top: 10, right: "6%", "--r": "5deg", transform: "rotate(5deg)", animationDelay: ".8s" } as React.CSSProperties}>Right vendors</span>
                <span className="ico solid" style={{ bottom: 6, left: "10%", "--r": "-3deg", transform: "rotate(-3deg)", animationDelay: "1.2s" } as React.CSSProperties}>One click</span>
                <div className="mock-rfpcheck" style={{ marginTop: 36 }}>
                  <div className="head">Invite to RFP‑0019</div>
                  {[true,true,true,false].map((on,i)=>(
                    <div key={i} className="check-row"><div className={`cb ${on?"on":"off"}`}>{on?"✓":""}</div><div className={`nm${i===0?" dark":""}`}></div></div>
                  ))}
                </div>
              </div>
              <div className="footer"><h3>Invite to your next RFPs.</h3><div className="arrow-pill" style={{ background: "var(--orange)" }}>✓</div></div>
            </div>
          </div>
          <div className="takeaway">
            <div className="quote">Leverage your channels. <span className="accent">Expand your network.</span> Source from the inside.</div>
            <div className="stat"><div className="v">22→41%</div><div className="k">Visitor → vendor</div></div>
          </div>
        </section>

        {/* ===== FOR VENDORS ===== */}
        <section id="vendors" className="vendors-section">
          <div className="vendors-hero">
            <div className="bg-dots"></div>
            <h2>For Vendors<span className="dot-end">.</span></h2>
          </div>
          <div className="vendor-cards">
            <div className="vcard">
              <div className="visual">
                <div className="mock-vbrief">
                  <div className="head"><div className="l" style={{ width: "50%", background: "var(--ink)" }}></div><div className="badge">RFP</div></div>
                  <div className="l w70"></div><div className="l w50"></div><div className="l" style={{ width: "80%" }}></div>
                  <div className="send">Submit →</div>
                </div>
              </div>
              <h3>Receive clear briefs.</h3>
              <p>One‑pager RFPs you can actually read. Submit your proposal in a unified format every time, no re‑typing.</p>
            </div>
            <div className="vcard">
              <div className="visual">
                <div className="mock-vtender">
                  {[{ amt: "$48k" }, { amt: "$120k" }, { amt: "$36k" }, { amt: "$92k" }].map((r,i)=>(
                    <div key={i} className="row"><div className="po">PO</div><div className="l"></div><div className="amt">{r.amt}</div></div>
                  ))}
                </div>
              </div>
              <h3>Explore pre‑POed tenders.</h3>
              <p>A live feed of real, budgeted tenders. Stop chasing leads that vanish and win projects that are actually funded.</p>
            </div>
            <div className="vcard">
              <div className="visual">
                <div className="mock-vconnect">
                  <svg className="lines" viewBox="0 0 140 120">
                    <line x1="16" y1="16" x2="70" y2="60" stroke="rgba(254,60,1,.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="124" y1="16" x2="70" y2="60" stroke="rgba(254,60,1,.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="16" y1="104" x2="70" y2="60" stroke="rgba(254,60,1,.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="124" y1="104" x2="70" y2="60" stroke="rgba(254,60,1,.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                  </svg>
                  {["c1","c2","c3","c4","center"].map(cls=>(
                    <div key={cls} className={`node ${cls}`}><svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z"/></svg></div>
                  ))}
                </div>
              </div>
              <h3>Connect with clients.</h3>
              <p>Request to join their vendors base through Traction Links. Expand your client base without sending a single cold email.</p>
            </div>
          </div>
        </section>

        {/* ===== AND MANY MORE ===== */}
        <section style={{ padding: "40px 0 80px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(64px,7vw,108px)", fontWeight: 700, letterSpacing: "-.04em", lineHeight: .95, color: "var(--ink)" }}>And many more<span style={{ color: "var(--orange)" }}>.</span></h2>
          </div>
          <div className="more-grid">
            <div className="mcard">
              <div className="icon-bubble">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L4 6v6c0 5 3 9 8 10 5-1 8-5 8-10V6l-8-4z" /><path d="M9 12l2 2 4-4" /></svg>
              </div>
              <h4>Vendor verification.</h4>
              <ul><li>Identity, registration &amp; tax compliance</li><li>Past‑work references on the record</li><li>Real‑time trust badges across the app</li></ul>
            </div>
            <div className="mcard">
              <div className="icon-bubble">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" /><circle cx="20" cy="4" r="1.5" /><circle cx="4" cy="20" r="1" /></svg>
              </div>
              <h4>AI across the workflow.</h4>
              <ul><li>AI RFP creation from a paragraph or voice note</li><li>Proposals summariser, read 14 bids in 2 minutes</li><li>Vendors matching, find who's right for the brief</li></ul>
            </div>
            <div className="mcard">
              <div className="icon-bubble">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></svg>
              </div>
              <h4>Make it yours.</h4>
              <ul><li>Customised company profiles</li><li>Branded Traction Links on your domain</li><li>White‑label vendor‑facing interfaces</li></ul>
            </div>
          </div>
        </section>

      </div>{/* end .page */}

      {/* ===== CTA STRIP ===== */}
      <div className="cta-strip" style={{ margin: "0 56px 80px" }}>
        <div className="bg-dots"></div>
        <h2 style={{ color: "white" }}>Start your first brief in 4 minutes.</h2>
        <div className="right">
          <p>No demos, no sales calls. Paste a paragraph and watch your first RFP land in your vendors' inboxes by lunch.</p>
          <div className="btns">
            <button className="btn-white" style={{ cursor: "pointer" }} onClick={handleCreate}>Start free →</button>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer>
        <div className="page">
          <div className="footer-row">
            <div className="brand">
              <BidLogo variant="orange" size={32} style={{ marginBottom: 16, display: "block" }} />
              <p>Bid turns messy sourcing into a clear workflow: create the RFP, invite the right vendors, and receive proposals in a unified format.</p>
            </div>
            <div>
              <h5>FOR REQUESTERS</h5>
              <a href="#rfp" onClick={scrollTo("rfp")}>RFP Crafting</a>
              <Link href="/marketplace">Marketplace</Link>
              <a href="#traction" onClick={scrollTo("traction")}>Traction Link</a>
            </div>
            <div>
              <h5>FOR VENDORS</h5>
              <a href="#vendors" onClick={scrollTo("vendors")}>Receive briefs</a>
              <a href="#vendors" onClick={scrollTo("vendors")}>Explore tenders</a>
              <a href="#vendors" onClick={scrollTo("vendors")}>Connect with clients</a>
            </div>
            <div>
              <h5>COMPANY</h5>
              <a href="mailto:hello@bid.sa">Contact</a>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
          <div className="footer-bot">
            <span>© 2026 Bid, Sourcing Redefined.</span>
            <span className="footer-partner">
              <img src="/saudi-tech-logo.png" alt="Saudi Tech" />
            </span>
            <span>
              <Link href="/terms">Terms</Link>{" · "}
              <Link href="/privacy">Privacy</Link>{" · "}
              <a href="#">Cookies</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
