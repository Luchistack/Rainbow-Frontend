import { Link } from "react-router-dom";
import { Star, Heart, Leaf, Users, MapPin } from "lucide-react";
import PageHeader from "../components/PageHeader";
import FeatureGrid from "../components/FeatureGrid";
import FAQ from "../components/FAQ";
import PhotoFeature from "../components/PhotoFeature";
import VideoFeature from "../components/VideoFeature";
import graphicPhoto from "../assets/feature-graphic.jpg";
import { BUSINESS_INFO, MAPS_LINK } from "../data/constants";


const PROMISES = [
  { t: "Cleaning Services", d: "Trained staff, proper equipment." },
  { t: "Upholstery Cleaning", d: "Sofas, mattresses, car interiors." },
  { t: "Spotless Guaranteed", d: "We re do it if it's not right." },
  { t: "Expert Care Every Time", d: "Consistent, careful handling." },
];

const VALUES = [
  { icon: Heart, color: "#EF4136", title: "Care First", desc: "Every garment is treated the way we'd treat our own." },
  { icon: Leaf, color: "#39B54A", title: "Fabric Safe", desc: "Detergents and methods chosen to protect colour and fibre." },
  { icon: Users, color: "#27AAE1", title: "Community Rooted", desc: "A neighbourhood business serving Maryland and beyond." },
  { icon: Star, color: "#F7941D", title: "Consistency", desc: "The same standard, whether it's your first order or your fiftieth." },
];

const MILESTONES = [
  { year: "Year 1", title: "Self wash counter opens", desc: "Rainbow Wash starts as a self service laundromat on Bode Oluwo Street." },
  { year: "Year 2", title: "Wash & fold added", desc: "Full service wash, dry and fold introduced for busy households." },
  { year: "Year 3", title: "Cleaning services launch", desc: "Home, office, deep clean and upholstery services join the lineup." },
  { year: "Today", title: "Online ordering & tracking", desc: "Book, pay and track everything from your phone, no more phone calls to check status." },
];

const ABOUT_FAQ = [
  { q: "Where exactly are you located?", a: "10 Prince Bode Oluwo Street, Mende, opposite Mende Town Hall, Maryland, Lagos." },
  { q: "Do you serve areas outside Mende Maryland?", a: "Yes, our pickup and delivery riders cover surrounding parts of Lagos. Enter your address at checkout and we'll confirm coverage." },
  { q: "Are your staff trained and vetted?", a: "All staff go through hands on training on fabric care, machine handling and customer service before working on customer orders." },
  { q: "What if something goes wrong with my order?", a: "Reach out via WhatsApp or phone with your order reference and we'll make it right, that's our spotless guarantee." },
];

export default function About() {
  return (
    <div>
      <PageHeader title="Rainbow Wash Laundry And Cleaning Services" subtitle="Coloring your world with cleanliness." />

      <div className="rw-section">
        <div className="rw-grid-2" style={{ alignItems: "center" }}>
          <div>
            <div className="rw-kicker">Our story</div>
            <h2 style={{ marginBottom: 16 }}>Professional laundry, done properly</h2>
            <p style={{ color: "var(--ink-soft)", marginBottom: 15, fontSize: 16.5 }}>
              Rainbow Wash Laundry and Cleaning Services opened its doors at 10 Prince Bode Oluwo Street, Mende, Maryland,
              with one goal: make laundry and home cleaning effortless for busy households and offices around Lagos.
            </p>
            <p style={{ color: "var(--ink-soft)", fontSize: 16.5 }}>
              What started as a self wash counter has grown into a full service operation, wash and fold, express
              turnaround, upholstery care, and doorstep pickup and delivery, all backed by an online ordering and
              tracking system so you always know where your items are.
            </p>
          </div>
          <div className="rw-grid-2">
            <div className="rw-card" style={{ textAlign: "center" }}>
              <b className="rw-price" style={{ fontSize: 27 }}>7</b>
              <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 5 }}>Core services</div>
            </div>
            <div className="rw-card" style={{ textAlign: "center" }}>
              <b className="rw-price" style={{ fontSize: 27 }}>7</b>
              <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 5 }}>Days open weekly</div>
            </div>
            <div className="rw-card" style={{ textAlign: "center" }}>
              <b className="rw-price" style={{ fontSize: 27 }}>100%</b>
              <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 5 }}>Online tracking</div>
            </div>
            <div className="rw-card" style={{ textAlign: "center" }}>
              <b className="rw-price" style={{ fontSize: 27 }}>2</b>
              <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 5 }}>Pickup & delivery lines</div>
            </div>
          </div>
        </div>
      </div>

      <FeatureGrid kicker="Our promise" title="Expert care, every time" items={PROMISES.map((x) => ({ icon: Star, color: "#1f6fb2", title: x.t, desc: x.d }))} />
    <VideoFeature
      videoId="JodXS8ZnRiI"
        // poster={graphicPhoto}
        kicker="Take a look inside"
        title="A space that feels like home"
        text="Step inside and it doesn't feel like a laundromat, it feels like somewhere you'd actually want to sit and wait. It's clean in the way a home is clean, not just a business: organised, cared for, and welcoming from the moment you walk in."
        // points={[
        //   "Spacious wash floor with room to sit and wait comfortably",
        //   "Bright, naturally lit interior, not a cramped back room setup",
        //   "Neatly organised self wash counters and drop off point",
        //   "Friendly staff on hand to help, not just process orders",
        // ]}
      />

      <FeatureGrid kicker="What we stand for" title="Our values" items={VALUES} />

      <PhotoFeature
        image={graphicPhoto}
        alt="Washing machines with folded laundry and pressed shirts"
        kicker="From counter to doorstep"
        title="One roof, every laundry need"
        text="Self wash machines for the DIY crowd, full wash and fold for the time strapped, and dry cleaning for the pieces that need a gentler touch all under one roof, all trackable online."
        points={["Colour safe sorting on every load", "Steam pressing for shirts and formalwear", "Careful packaging for delivery"]}
        reverse
      />

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-section-head">
          <div className="rw-kicker">Our journey</div>
          <h2>How we got here</h2>
        </div>
        <div className="rw-steps-row">
          {MILESTONES.map((m, idx) => (
            <div className="rw-step-card" key={m.title}>
              <div className="rw-step-num">{idx + 1}</div>
              <div style={{ color: "var(--blue)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{m.year}</div>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-cta-band">
          <div>
            <h3><MapPin size={20} style={{ verticalAlign: -3, marginRight: 6 }} />Find us in Mende Maryland</h3>
            <p>{BUSINESS_INFO.address} Open 7 days a week.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="rw-btn rw-btn-ghost"
              style={{ background: "rgba(255,255,255,.06)", color: "#fff", borderColor: "rgba(255,255,255,.25)" }}
            >
              <MapPin size={16} /> Get Directions
            </a>
            <Link to="/services" className="rw-btn rw-btn-rainbow">See our services</Link>
          </div>
        </div>
      </div>

      <FAQ kicker="Questions" title="About Rainbow Wash" items={ABOUT_FAQ} />
    </div>
  );
}



// import { Link } from "react-router-dom";
// import { Star, Heart, Leaf, Users, MapPin } from "lucide-react";
// import PageHeader from "../components/PageHeader";
// import FeatureGrid from "../components/FeatureGrid";
// import FAQ from "../components/FAQ";
// import PhotoFeature from "../components/PhotoFeature";
// import VideoFeature from "../components/VideoFeature";
// import graphicPhoto from "../assets/feature-graphic.jpg";
// import { BUSINESS_INFO, MAPS_LINK } from "../data/constants";

// // Place the video file in the public/videos folder (e.g. public/videos/rainbow-wash-tour.mp4)
// // so it's served as-is rather than bundled. Update this filename to match the real file.
// const TOUR_VIDEO_SRC = "/videos/rainbow-wash-tour.mp4";

// const PROMISES = [
//   { t: "Cleaning Services", d: "Trained staff, proper equipment." },
//   { t: "Upholstery Cleaning", d: "Sofas, mattresses, car interiors." },
//   { t: "Spotless Guaranteed", d: "We re-do it if it's not right." },
//   { t: "Expert Care Every Time", d: "Consistent, careful handling." },
// ];

// const VALUES = [
//   { icon: Heart, color: "#EF4136", title: "Care First", desc: "Every garment is treated the way we'd treat our own." },
//   { icon: Leaf, color: "#39B54A", title: "Fabric-Safe", desc: "Detergents and methods chosen to protect colour and fibre." },
//   { icon: Users, color: "#27AAE1", title: "Community Rooted", desc: "A neighbourhood business serving Maryland and beyond." },
//   { icon: Star, color: "#F7941D", title: "Consistency", desc: "The same standard, whether it's your first order or your fiftieth." },
// ];

// const MILESTONES = [
//   { year: "Year 1", title: "Self-wash counter opens", desc: "Rainbow Wash starts as a self-service laundromat on Bode Oluwo Street." },
//   { year: "Year 2", title: "Wash & fold added", desc: "Full-service wash, dry and fold introduced for busy households." },
//   { year: "Year 3", title: "Cleaning services launch", desc: "Home, office, deep-clean and upholstery services join the lineup." },
//   { year: "Today", title: "Online ordering & tracking", desc: "Book, pay and track everything from your phone, no more phone calls to check status." },
// ];

// const ABOUT_FAQ = [
//   { q: "Where exactly are you located?", a: "10 Prince Bode Oluwo Street, Mende, opposite Mende Town Hall, Maryland, Lagos." },
//   { q: "Do you serve areas outside Mende Maryland?", a: "Yes, our pickup and delivery riders cover surrounding parts of Lagos. Enter your address at checkout and we'll confirm coverage." },
//   { q: "Are your staff trained and vetted?", a: "All staff go through hands-on training on fabric care, machine handling and customer service before working on customer orders." },
//   { q: "What if something goes wrong with my order?", a: "Reach out via WhatsApp or phone with your order reference and we'll make it right, that's our spotless guarantee." },
// ];

// export default function About() {
//   return (
//     <div>
//       <PageHeader title="About Rainbow Wash" subtitle="Coloring your world with cleanliness." />

//       <div className="rw-section">
//         <div className="rw-grid-2" style={{ alignItems: "center" }}>
//           <div>
//             <div className="rw-kicker">Our story</div>
//             <h2 style={{ marginBottom: 16 }}>Professional laundry, done properly</h2>
//             <p style={{ color: "var(--ink-soft)", marginBottom: 15, fontSize: 16.5 }}>
//               Rainbow Wash Laundry and Cleaning Services opened its doors at 10 Prince Bode Oluwo Street, Mende, Maryland,
//               with one goal: make laundry and home cleaning effortless for busy households and offices around Lagos.
//             </p>
//             <p style={{ color: "var(--ink-soft)", fontSize: 16.5 }}>
//               What started as a self-wash counter has grown into a full-service operation, wash and fold, express
//               turnaround, upholstery care, and doorstep pickup and delivery, all backed by an online ordering and
//               tracking system so you always know where your items are.
//             </p>
//           </div>
//           <div className="rw-grid-2">
//             <div className="rw-card" style={{ textAlign: "center" }}>
//               <b className="rw-price" style={{ fontSize: 27 }}>7</b>
//               <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 5 }}>Core services</div>
//             </div>
//             <div className="rw-card" style={{ textAlign: "center" }}>
//               <b className="rw-price" style={{ fontSize: 27 }}>7</b>
//               <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 5 }}>Days open weekly</div>
//             </div>
//             <div className="rw-card" style={{ textAlign: "center" }}>
//               <b className="rw-price" style={{ fontSize: 27 }}>100%</b>
//               <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 5 }}>Online tracking</div>
//             </div>
//             <div className="rw-card" style={{ textAlign: "center" }}>
//               <b className="rw-price" style={{ fontSize: 27 }}>2</b>
//               <div style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 5 }}>Pickup & delivery lines</div>
//             </div>
//           </div>
//         </div>
//       </div>

//       <FeatureGrid kicker="Our promise" title="Expert care, every time" items={PROMISES.map((x) => ({ icon: Star, color: "#1f6fb2", title: x.t, desc: x.d }))} />

//       <VideoFeature
//         src={TOUR_VIDEO_SRC}
//         poster={graphicPhoto}
//         kicker="Take a look inside"
//         title="A space that feels like home"
//         text="Step inside and it doesn't feel like a laundromat, it feels like somewhere you'd actually want to sit and wait. The wash floor is bright and spacious, with plenty of room to move between machines, comfortable seating for anyone dropping off or waiting on a self-wash load, and natural light pouring in through the front. It's clean in the way a home is clean, not just a business: organised, cared for, and welcoming from the moment you walk in."
//         points={[
//           "Spacious wash floor with room to sit and wait comfortably",
//           "Bright, naturally lit interior, not a cramped back-room setup",
//           "Neatly organised self-wash counters and drop-off point",
//           "Friendly staff on hand to help, not just process orders",
//         ]}
//       />

//       <FeatureGrid kicker="What we stand for" title="Our values" items={VALUES} />

//       <PhotoFeature
//         image={graphicPhoto}
//         alt="Washing machines with folded laundry and pressed shirts"
//         kicker="From counter to doorstep"
//         title="One roof, every laundry need"
//         text="Self-wash machines for the DIY crowd, full wash-and-fold for the time-strapped, and dry cleaning for the pieces that need a gentler touch, all under one roof, all trackable online."
//         points={["Colour-safe sorting on every load", "Steam pressing for shirts and formalwear", "Careful packaging for delivery"]}
//         reverse
//       />

//       <div className="rw-section" style={{ paddingTop: 0 }}>
//         <div className="rw-section-head">
//           <div className="rw-kicker">Our journey</div>
//           <h2>How we got here</h2>
//         </div>
//         <div className="rw-steps-row">
//           {MILESTONES.map((m, idx) => (
//             <div className="rw-step-card" key={m.title}>
//               <div className="rw-step-num">{idx + 1}</div>
//               <div style={{ color: "var(--blue)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{m.year}</div>
//               <h3>{m.title}</h3>
//               <p>{m.desc}</p>
//             </div>
//           ))}
//         </div>
//       </div>

//       <div className="rw-section" style={{ paddingTop: 0 }}>
//         <div className="rw-cta-band">
//           <div>
//             <h3><MapPin size={20} style={{ verticalAlign: -3, marginRight: 6 }} />Find us in Mende Maryland</h3>
//             <p>{BUSINESS_INFO.address} Open 7 days a week.</p>
//           </div>
//           <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
//             <a
//               href={MAPS_LINK}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="rw-btn rw-btn-ghost"
//               style={{ background: "rgba(255,255,255,.06)", color: "#fff", borderColor: "rgba(255,255,255,.25)" }}
//             >
//               <MapPin size={16} /> Get Directions
//             </a>
//             <Link to="/services" className="rw-btn rw-btn-rainbow">See our services</Link>
//           </div>
//         </div>
//       </div>

//       <FAQ kicker="Questions" title="About Rainbow Wash" items={ABOUT_FAQ} />
//     </div>
//   );
// }