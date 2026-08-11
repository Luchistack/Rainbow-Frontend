import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import slide1 from "../assets/hero-slide-1.jpg";
import slide2 from "../assets/hero-slide-2.jpg";
import slide3 from "../assets/hero-slide-3.jpg";
import slide4 from "../assets/hero-slide-4.jpg";
import { DELIVERY_FEE } from "../data/constants";
import { money } from "../utils/format";

const SLIDES = [slide1, slide2, slide3, slide4];

const BUBBLES = [
  { left: "6%", size: 14, dur: 12, delay: 0 },
  { left: "16%", size: 8, dur: 9, delay: 2 },
  { left: "27%", size: 20, dur: 15, delay: 1 },
  { left: "40%", size: 10, dur: 10, delay: 4 },
  { left: "55%", size: 16, dur: 13, delay: 0.5 },
  { left: "68%", size: 9, dur: 8, delay: 3 },
  { left: "80%", size: 22, dur: 16, delay: 2.5 },
  { left: "90%", size: 12, dur: 11, delay: 1.5 },
];

export default function Hero() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rw-hero">
      <div className="rw-hero-bg">
        {SLIDES.map((src, idx) => (
          <div key={idx} className={`rw-hero-bg-layer ${idx === i ? "show" : ""}`} style={{ backgroundImage: `url(${src})` }} />
        ))}
        <div className="rw-hero-tint" />
      </div>

      <div className="rw-bubbles" aria-hidden="true">
        {BUBBLES.map((b, idx) => (
          <span key={idx} className="rw-bubble" style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
        ))}
      </div>

      <div className="rw-hero-inner">
        <div className="rw-eyebrow"><span className="dot" />Now open in Mende Maryland · Opened Aug 8th</div>
        <h1>Coloring your world with <em>cleanliness.</em></h1>
        <p className="lead">
          Wash, iron, dry clean and deep clean, pickup and delivery included. Rainbow Wash takes the laundry
          pile and the dusty upholstery off your to do list.
        </p>
        <div className="rw-hero-actions">
          <Link to="/order-laundry" className="rw-btn rw-btn-rainbow">
            Order Laundry <ArrowRight size={16} />
          </Link>
          <Link to="/book-cleaning" className="rw-btn rw-btn-hero-ghost">
            Book a Cleaning
          </Link>
        </div>
        <div className="rw-hero-stats">
          <div><b>7</b><span>Services offered</span></div>
          <div><b>7 days</b><span>Open every day</span></div>
          <div><b>From</b><span>Pickup to Delivery</span></div>
        </div>

  {/* <div><b>From {money(DELIVERY_FEE)}</b><span>Pickup to Delivery</span></div> */}

        <div className="rw-hero-dots">
          {SLIDES.map((_, idx) => (
            <button key={idx} className={idx === i ? "active" : ""} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`} />
          ))}
        </div>
      </div>

      <div className="rw-hero-waves" aria-hidden="true">
        <svg viewBox="0 0 1600 140" preserveAspectRatio="none" className="rw-wave-back">
          <path d="M0,64 C 267,120 533,10 800,55 C 1067,100 1333,20 1600,64 L1600,140 L0,140 Z" fill="#dff1fb" />
        </svg>
        <svg viewBox="0 0 1600 140" preserveAspectRatio="none" className="rw-wave-front">
          <path d="M0,80 C 267,30 533,110 800,70 C 1067,30 1333,110 1600,70 L1600,140 L0,140 Z" fill="#f2f8fc" />
        </svg>
      </div>
    </div>
  );
}
