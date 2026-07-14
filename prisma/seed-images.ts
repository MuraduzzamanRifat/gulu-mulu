/**
 * Demo imagery for the seed.
 *
 * Every URL here was harvested from a live Unsplash search page (not guessed from memory) and
 * then HTTP-checked twice — 160/160 returned 200, with a negative control confirming that
 * fabricated IDs correctly 404. images.unsplash.com is already allow-listed in next.config.ts.
 *
 * Why not picsum? It always resolves, but it serves random landscapes — a mountain range as a
 * "Cotton Saree" makes the whole marketplace look broken to a human, even though nothing is.
 *
 * These are hotlinks to Unsplash. A photographer can delete a photo months from now, so treat
 * this as DEMO data: real sellers upload real photos to object storage (R2/S3) at launch.
 */

/** Product photos, keyed by the category slug used in the seed. */
export const CATEGORY_IMAGES: Record<string, string[]> = {
  'women-bottom': [
    'https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589565920470-c051a55c9c5d?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1603290939650-b553549a5739?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1549575810-b9b7abc51d9e?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560243563-062bfc001d68?w=800&q=75&auto=format&fit=crop',
  ],
  'women-topwear': [
    'https://images.unsplash.com/photo-1665065952009-a5dc00f423d4?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1613891737415-be7670d21c19?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1611235116156-0cbda6649efb?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620062161349-7abc66286084?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551799517-eb8f03cb5e6a?w=800&q=75&auto=format&fit=crop',
  ],
  'women-footwear': [
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531310197839-ccf54634509e?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1621996659490-3275b4d0d951?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589807751586-b5c674fd737c?w=800&q=75&auto=format&fit=crop',
  ],
  // NOTE: the seed's category slug is plural ("sarees"); keep both keys in sync.
  sarees: [
    'https://images.unsplash.com/photo-1618901185975-d59f7091bcfe?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1610030469668-8e9f641aaf27?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1610189025857-f42fe6e8dd91?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1610189012906-4c0aa9b9781e?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1610030469839-f909584b43f1?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1616756141603-6d37d5cde2a2?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1609748340041-f5d61e061ebc?w=800&q=75&auto=format&fit=crop',
  ],
  kurti: [
    'https://images.unsplash.com/photo-1745313452052-0e4e341f326c?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1708534419572-6e6614a53ca1?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1597983073750-16f5ded1321f?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1597983073512-90bd150e19f6?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1597983073540-684a10b15ab1?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1667665970124-2273c6ef3489?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1708534246051-7f47b279e94b?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1759840278381-bf7d5e332050?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1677760904764-801d55083330?w=800&q=75&auto=format&fit=crop',
  ],
  'men-topwear': [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1626557981101-aae6f84aa6ff?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589234217365-08d3e0e5cf42?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1603252110481-7ba873bf42ab?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=75&auto=format&fit=crop',
  ],
  'men-bottom': [
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1608366558876-185ea88608eb?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1714143136372-ddaf8b606da7?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1714143136367-7bb68f3f0669?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1718252540511-e958742e4165?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1715758890151-2c15d5d482aa?w=800&q=75&auto=format&fit=crop',
  ],
  'men-footwear': [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1614253429340-98120bd6d753?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556774687-0e2fdd0116c0?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=75&auto=format&fit=crop',
  ],
  panjabi: [
    'https://images.unsplash.com/photo-1727835523545-70ee992b5763?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1744551358303-46edae8b374b?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1727835523550-18478cacefa2?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1647689662423-7948c8523256?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1734418038940-2e5ee6a1b478?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1734418042215-a1b79c18698f?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1734418046848-6d168e211b45?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1734418040900-e964f84e8abb?w=800&q=75&auto=format&fit=crop',
  ],
  'kids-kurti': [
    'https://images.unsplash.com/photo-1639563853019-779fb4e41844?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1597294151491-1d22b38698d6?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1594135356513-14291e55162a?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1597294150753-b6e790b68d1c?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1622218286192-95f6a20083c7?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1566454544259-f4b94c3d758c?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1632337948797-ba161d29532b?w=800&q=75&auto=format&fit=crop',
  ],
  'kids-footwear': [
    'https://images.unsplash.com/photo-1540479859555-17af45c78602?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1584564515943-b54cbb61836b?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1552912276-56ef47874741?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574946943172-4800feadfab7?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507464098880-e367bc5d2c08?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1503449377594-32dd9ac4467c?w=800&q=75&auto=format&fit=crop',
  ],
  'baby-clothing': [
    'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546015720-b8b30df5aa27?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560506840-ec148e82a604?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1543346242-2b8e41fb91ca?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=800&q=75&auto=format&fit=crop',
  ],
  'baby-accessories': [
    'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1587116215900-bb2bba7c7cff?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1605644235751-709c7254e3e3?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1616666428759-679a7d578307?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1569974641446-22542de88536?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1622290291165-d341f1938b8a?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1636905206149-bc3217e6a198?w=800&q=75&auto=format&fit=crop',
  ],
  skincare: [
    'https://images.unsplash.com/photo-1581182800629-7d90925ad072?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555820585-c5ae44394b79?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1585945037805-5fd82c2e60b1?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1581182815808-b6eb627a8798?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1608068811588-3a67006b7489?w=800&q=75&auto=format&fit=crop',
  ],
  makeup: [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1631214499500-2e34edcaccfe?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598528738936-c50861cc75a9?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1615396899839-c99c121888b0?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1608979048467-6194dabc6a3d?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&q=75&auto=format&fit=crop',
  ],
  haircare: [
    'https://images.unsplash.com/photo-1564141696939-9eb6e957ccfc?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1574015974293-817f0ebebb74?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1554519934-e32b1629d9ee?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544717304-a2db4a7b16ee?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1560264641-1b5191cc63e2?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&q=75&auto=format&fit=crop',
  ],
  bedding: [
    'https://images.unsplash.com/photo-1564019472231-4586c552dc27?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1601276174812-63280a55656e?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1635594202056-9ea3b497e5c0?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1536349788264-1b816db3cc13?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598535746036-87d13382f6a6?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1542728929-2b5d9a0c8d48?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1605459437907-541c4e2c0ed1?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1606855637183-ea2a00b6f15f?w=800&q=75&auto=format&fit=crop',
  ],
  kitchen: [
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556909211-36987daf7b4d?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1609347744403-2306e8a9ae27?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1514237487632-b60bc844a47d?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556185781-a47769abb7ee?w=800&q=75&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550223026-0d6fd780c560?w=800&q=75&auto=format&fit=crop',
  ],
}

/** Fallback pool for any category not listed above (top-level categories, etc.). */
export const GENERIC_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=75&auto=format&fit=crop',
]

export const HERO_BANNERS: string[] = [
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1600&q=75&auto=format&fit=crop',
]

export const SECONDARY_BANNERS: string[] = [
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=75&auto=format&fit=crop',
]

/** "Shop Under ৳X" collection cards, keyed by a hint word in the collection label. */
export const COLLECTION_IMAGES: Record<string, string> = {
  beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=75&auto=format&fit=crop',
  watches: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=75&auto=format&fit=crop',
  bags: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=75&auto=format&fit=crop',
  panjabi: 'https://images.unsplash.com/photo-1727835523545-70ee992b5763?w=800&q=75&auto=format&fit=crop',
  sarees: 'https://images.unsplash.com/photo-1618901185975-d59f7091bcfe?w=800&q=75&auto=format&fit=crop',
  kids: 'https://images.unsplash.com/photo-1622218286192-95f6a20083c7?w=800&q=75&auto=format&fit=crop',
}

export const BRAND_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1583209814683-c023dd293cc6?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1521840233161-295ed621e056?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1511923199659-1c16881689de?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=75&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1559563458-527698bf5295?w=400&q=75&auto=format&fit=crop',
]

/**
 * Pick a photo for a product deterministically, so re-seeding reproduces the same catalogue.
 * Cycles through the category's pool by a stable hash of the product slug + image index, so a
 * product's 2-4 photos are different from each other and neighbouring products don't all match.
 */
export function pickProductImage(categorySlug: string, productSlug: string, index: number): string {
  const pool = CATEGORY_IMAGES[categorySlug] ?? GENERIC_IMAGES
  let hash = 0
  const key = `${productSlug}:${index}`
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return pool[hash % pool.length]
}

/** Category tile image — reuse the first photo from that category's own pool. */
export function pickCategoryImage(categorySlug: string): string {
  const pool = CATEGORY_IMAGES[categorySlug]
  if (pool?.length) return pool[0].replace('w=800', 'w=400')
  let hash = 0
  for (let i = 0; i < categorySlug.length; i++) {
    hash = (hash * 31 + categorySlug.charCodeAt(i)) >>> 0
  }
  return GENERIC_IMAGES[hash % GENERIC_IMAGES.length].replace('w=800', 'w=400')
}

/** Match a "Shop Under ৳X" label to a collection photo by keyword; fall back to a hash. */
export function pickCollectionImage(label: string): string {
  const lower = label.toLowerCase()
  for (const [hint, url] of Object.entries(COLLECTION_IMAGES)) {
    if (lower.includes(hint)) return url
  }
  const keys = Object.values(COLLECTION_IMAGES)
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0
  }
  return keys[hash % keys.length]
}
