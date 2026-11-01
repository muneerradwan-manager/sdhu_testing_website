/**
 * The 3D models on the "جولة ثلاثية الأبعاد" page (the two Holy Mosques, Arafat, the Jamarat, and the Aisha and Quba mosques), shown as their authors published them on Sketchfab
 * (embedded through Sketchfab's own player: nothing is downloaded or hosted here, and the rights stay
 * with the authors). The two mosques are heavy models, so none loads before the visitor asks for it.
 */

import MODELS_DATA from "@/testdata/content/tour-3d-models.json";

export type Model3D = {
  /** Sketchfab model id */
  uid: string;
  title: string;
  place: string;
  /** Sketchfab author, credited under the viewer */
  author: string;
  /** Sketchfab page of the model */
  url: string;
  /** A heavy model: better on Wi-Fi */
  heavy: boolean;
  size: string;
  image: string;
  /** Where the photograph's subject is, when its middle is sky (CSS object-position) */
  focus?: string;
  /** For a photograph whose licence asks to name its author (the others: the site's Wikimedia Commons note) */
  photoCredit?: string;
  /** When the pilgrim comes to this place */
  when: string;
  about: string;
  points: string[];
};

export const MODELS_3D: Model3D[] = MODELS_DATA as Model3D[];

/** Sketchfab's player for a model: starts at once (the visitor asked for it), dark, no tracking */
export const embedUrl = (uid: string) => `https://sketchfab.com/models/${uid}/embed?autostart=1&ui_theme=dark&dnt=1`;
