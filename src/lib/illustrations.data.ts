/**
 * Illustrations generated with GPT Image 2.5 on Higgsfield (Nov 1, 2026), and one Seedance 2.5 clip.
 * Engravings: 19th-century wood-engraving style, single ink, anchored on "hero".
 * Spots: mid-century primer style, transparent PNG, anchored on "spot-hen".
 * scripts/fetch-illustrations.mjs downloads these into public/illustrations at build time.
 */

const B = "https://d8j0ntlcm91z4.cloudfront.net/user_33j1l46rj2EZm5uAKsKfpzYfDD5/";

export type IllustrationKind = "engraving" | "spot" | "video";

export interface IllustrationEntry {
  id: string;
  kind: IllustrationKind;
  remote: string;
  ext: "png" | "mp4";
  width: number;
  height: number;
  alt: string;
}

const e = (id: string, file: string, alt: string, width = 2048, height = 1365): IllustrationEntry => ({
  id,
  kind: "engraving",
  remote: `${B}${file}.png`,
  ext: "png",
  width,
  height,
  alt,
});

const s = (id: string, file: string, alt: string): IllustrationEntry => ({
  id,
  kind: "spot",
  remote: `${B}${file}.png`,
  ext: "png",
  width: 1024,
  height: 1024,
  alt,
});

export const ILLUSTRATIONS: IllustrationEntry[] = [
  e("hero", "hf_20261101_070649_ac3a57c5-bb9e-482d-a54d-4e97f48a4464", "Wood engraving of a boy reading on a bench under an oak beside a one-room schoolhouse while his mother looks on.", 2688, 1520),
  e("fable-tortoise-hare", "hf_20261101_071645_9191f2dd-d31e-4c99-a8f7-4e4cd6d57580", "Engraving of a hare asleep under a tree while a tortoise walks past on a country road."),
  e("fable-red-hen", "hf_20261101_071644_22fd8c9b-7d2b-4463-94f2-a7fe155c8655", "Engraving of the little red hen carrying wheat while a cat, a dog and a pig doze by the barn."),
  e("fable-shepherd-boy", "hf_20261101_071643_20ce9149-2e6f-4a86-ab31-6111ea79a93a", "Engraving of a shepherd boy with his flock on a hillside above a village."),
  e("fable-ant-grasshopper", "hf_20261101_071642_e99324a0-7b0c-4254-9373-c37565e145af", "Engraving of an ant carrying grain beside a grasshopper resting on a wheat stalk."),
  e("fable-lion-mouse", "hf_20261101_071643_aa501366-de6b-4d2f-9108-3ca84a554262", "Engraving of a lion caught in a net while a mouse gnaws the rope."),
  e("fable-crow-pitcher", "hf_20261101_071643_effaf7de-60bc-4f2a-80fb-2f7885d60241", "Engraving of a crow dropping a pebble into a tall pitcher on a stone wall."),
  e("hearth-reading", "hf_20261101_071641_6676db58-402c-48dc-8deb-bbf1731afbda", "Engraving of a mother and daughter reading in a rocking chair by the hearth."),
  e("schoolroom", "hf_20261101_071647_7b8b1ade-b2ed-41ee-ba8f-07b24fc111e0", "Engraving of a schoolmistress teaching four children at a long table in a one-room schoolhouse."),
  e("desk-primer", "hf_20261101_071642_3beff337-f99f-4513-82bb-be55f737aa98", "Engraving of an open primer on a school desk with an inkwell, a pen and a slate."),
  e("wren", "hf_20261101_071642_da4a4ef2-df73-4c4b-b2d4-8aba9ff9b4a4", "Engraving of a wren perched on a flowering hawthorn branch.", 2048, 2048),
  e("slate-copywork", "hf_20261101_071645_7070f5e8-56f8-4410-99bb-7f19275f3e7e", "Engraving of a boy copying letters onto a slate at a desk by a window."),
  e("village-lane", "hf_20261101_071644_85e1138c-a667-44d8-bdfe-beb0906bb80e", "Engraving of a village lane at evening with a church spire and elm trees.", 2688, 1520),
  e("horse-fence", "hf_20261101_071718_c3c27725-bae9-4814-8582-e04df3bc8663", "Engraving of a girl offering an apple to a horse over a fence."),
  e("ship-sea", "hf_20261101_071719_cede5820-55e8-4a7d-b815-39d430ed8902", "Engraving of a three-masted ship under sail with a lighthouse beyond."),
  e("family-table", "hf_20261101_071718_61187016-86da-482b-85e1-1909d323025d", "Engraving of a father reading aloud to three children by lamplight."),
  e("bookshelf", "hf_20261101_071719_f82c032d-0e15-4311-a572-725f2e110bc5", "Engraving of a bookshelf, a globe, a candlestick and a reading chair."),

  s("spot-hen", "hf_20261101_071718_c91a1421-9fe7-46e4-a410-9234a57266b3", "A white hen"),
  s("spot-apple", "hf_20261101_072521_4db98478-fe03-4968-9ad9-a689c4d74421", "A red apple"),
  s("spot-egg", "hf_20261101_072523_b99d7143-667a-458a-8fa2-564376d359ca", "A brown egg"),
  s("spot-inkwell", "hf_20261101_072524_425579fa-5f23-458a-9401-4cc8699f1959", "An inkwell with a pen"),
  s("spot-ox", "hf_20261101_072522_4001d915-4cfe-42c3-addc-4c44e9603177", "A brown ox"),
  s("spot-umbrella", "hf_20261101_072524_c1bae64d-8c5f-49d5-b364-859216e99fd1", "A red and white umbrella"),
  s("spot-mitten", "hf_20261101_072525_b2fb0e7d-dbf6-4869-96b8-f6acc4003f6d", "A red mitten"),
  s("spot-top", "hf_20261101_072524_cebfc2dd-511e-4335-88ee-0cda5c7a53a0", "A spinning top"),
  s("spot-sun", "hf_20261101_072522_4b41bd2b-8adf-4acd-83eb-519b73b78b86", "A smiling sun"),
  s("spot-pig", "hf_20261101_072523_e27aada8-c13a-4988-bfb1-2ea9db57324a", "A pink pig"),
  s("spot-net", "hf_20261101_072523_dbfd674e-c81d-44f9-a6fb-ae86dfb64b3f", "A butterfly net"),
  s("spot-bell", "hf_20261101_072522_d52ef327-bcdd-48e0-82f1-8007d43d64f1", "A brass school bell"),
  s("spot-dog", "hf_20261101_072522_6ad02b8b-2fa5-4e68-a9e3-1a49cc25bae0", "A brown and white dog"),
  s("spot-goat", "hf_20261101_072551_0ffe8f1f-4b0a-41e4-b1e8-87c29f19833c", "A white goat"),
  s("spot-cat", "hf_20261101_072547_f2c60339-f8cf-4dfa-b0eb-08ab37194581", "An orange cat"),
  s("spot-kite", "hf_20261101_072548_32a46fc2-5629-44d1-93df-20c648e39651", "A red kite with ribbons"),
  s("spot-fan", "hf_20261101_072549_37301dfa-992e-4f50-abdd-094bebd66e78", "A folding fan"),
  s("spot-lamp", "hf_20261101_072552_63ae6afa-186a-4bdd-9adb-c2aba4d204e3", "An oil lamp"),
  s("spot-rabbit", "hf_20261101_072548_51a4470e-fe32-41d9-bb5b-8b350b3a9804", "A brown rabbit"),
  s("spot-jug", "hf_20261101_072551_4d79f465-97e4-4c7f-b258-103b606595a2", "A striped jug"),
  s("spot-wagon", "hf_20261101_072552_92e5e903-4a1e-4f45-8a97-a6bc3865dfe1", "A red wagon"),
  s("spot-vase", "hf_20261101_072550_623a14b2-ce43-435b-919e-189814ea38ae", "A blue vase of flowers"),
  s("spot-quilt", "hf_20261101_072552_3e759bc2-163f-4298-b9aa-ca133c3f3b00", "A folded patchwork quilt"),
  s("spot-yoyo", "hf_20261101_072550_3d46c42d-cb7e-4e7b-86a2-5247e6d6d3da", "A red yo-yo"),
  s("spot-zebra", "hf_20261101_072550_a188380d-417b-40f0-95e3-2893052f7c3d", "A zebra"),
  s("spot-fox", "hf_20261101_072554_f6f34bbb-89d1-435b-af65-5dd38b7ee5e0", "A red fox"),

  {
    id: "hero-motion",
    kind: "video",
    remote: `${B}hf_20261101_071702_1e469536-55f0-4b9e-b6d4-491e05c92913.mp4`,
    ext: "mp4",
    width: 1920,
    height: 1080,
    alt: "The hero engraving in slow motion: oak leaves stir as the camera moves toward the boy reading.",
  },
];
