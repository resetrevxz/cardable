// Approved word lists for public aliases. Plain, friendly, non-personal words only; nothing that is a name, a place or a
// slur in any common language that the authors know of. 256 x 256 gives 65,536 aliases. The server draws at random,
// retries on a collision and refuses to issue past 90% of the pool, so an exhausted pool is a loud, operator-visible
// error rather than silently reusing a name.
export const ADJECTIVES = ('Amber Ample Arctic Ashen Autumn Azure Bold Brave Breezy Bright Brisk Bronze Calm Candid Careful Cedar Clever Cobalt Copper ' +
  'Coral Cosmic Crisp Crystal Curious Dapper Dawn Deep Deft Distant Dusky Eager Early Easy Elder Ember Emerald Even Fair Faint Fancy Fast Fearless ' +
  'Fern Fine Firm Flint Fluent Fond Frosty Gentle Gilded Glad Glassy Golden Grand Green Hardy Hazel Honest Humble Icy Idle Indigo Inky Iron Ivory ' +
  'Jade Jolly Keen Kind Lively Lone Lucid Lucky Lunar Maple Mellow Merry Mighty Mild Minty Misty Modest Mossy Neat Nimble Noble Nova Oaken Olive ' +
  'Opal Orange Patient Pearl Placid Plain Plucky Polar Polite Prime Proud Pure Quartz Quick Quiet Rapid Ready Regal Rosy Round Royal Ruby Rustic ' +
  'Sable Sage Sandy Scarlet Serene Sharp Shy Silent Silver Sleek Smart Smooth Snowy Solar Solid Spry Steady Stellar Still Stormy Sturdy Sunny ' +
  'Swift Tame Teal Tidy Tiny Topaz True Twilight Umber Upbeat Velvet Vivid Warm Wary Weathered Wild Windy Wise Witty Woven Young Zesty Zippy ' +
  'Agile Alpine Ancient Arched Balmy Beaming Blithe Bonny Boreal Burly Chilly Chosen Civic Classic Cloudy Compact Cozy Crafty Cunning Daring ' +
  'Dashing Dazzling Dear Dewy Direct Dreamy Dry Earnest Eastern Elfin Exact Fabled Fabulous Famed Feisty Fiery Fleet Floral Folksy Fresh Gallant ' +
  'Gleaming Glowing Graceful Grassy Hale Handy Hasty Hearty Hidden Hushed Jaunty Jovial Kindly Knightly Lanky Leafy Light Likely Liquid Little ' +
  'Lofty Loyal Lusty Magic Mantled Marine Mesa Mirthful Moonlit Natural Nearby Newborn Northern Notable Nutty Orchid Painted Peppy Perky Pliant ' +
  'Poised Prized Pretty Proper Radiant Rambling Rare Robust Rolling Rooted Sapphire Seaside Shaded Shining Silken Slate Smiling Snug Soaring ' +
  'Spiral Spotted Starry Stoic Sublime Sudden Sunlit Tawny Tender Thorny Thrifty Tireless Trusty Upright Valiant Verdant Vibrant Wavy Wintry').split(' ');
export const NOUNS = ('Acorn Anchor Arrow Aspen Badger Banner Basil Beacon Beetle Birch Bison Bobcat Breeze Brook Buckle Cactus Canyon Cardinal Caribou ' +
  'Cedar Chestnut Cinder Clover Comet Condor Coyote Crane Creek Crow Daisy Delta Dingo Dolphin Dove Dragonfly Dune Eagle Echo Egret Elk Ember Falcon ' +
  'Fawn Ferret Finch Fjord Flame Flint Fox Gazelle Gecko Glacier Gopher Granite Grove Gull Harbor Hare Hawk Hazel Heron Hickory Hollow Horizon Ibis ' +
  'Iris Island Jackal Jaguar Jay Juniper Kestrel Kite Koala Lagoon Lantern Lark Laurel Lemur Lichen Lily Lizard Llama Lotus Lynx Magpie Mallard ' +
  'Mantis Maple Marlin Marmot Meadow Merlin Mesa Mink Moose Moth Mountain Newt Nightjar Oak Ocelot Olive Orchid Osprey Otter Owl Oyster Panda Panther ' +
  'Pebble Pelican Penguin Petal Pigeon Pine Plover Pond Poplar Prairie Puffin Quail Quartz Rabbit Raccoon Rain Raven Reed Ridge River Robin Rook ' +
  'Sable Saffron Sage Salmon Sandpiper Sparrow Spruce Squirrel Starling Stoat Stork Summit Sunbeam Swallow Swan Swift Tamarack Tanager Tern Thistle ' +
  'Thrush Tiger Toucan Trout Tulip Turtle Valley Vole Walrus Warbler Weasel Willow Wolf Wombat Wren Yak Yarrow Zebra Zephyr Avocet Barnacle Bluebell ' +
  'Bramble Buttercup Camel Cormorant Cypress Dahlia Dandelion Dormouse Eider Fennel Fig Gannet Gentian Gerbil Ginkgo Goldfinch Gorse Hedgehog Heather ' +
  'Honeybee Hummingbird Impala Jasmine Katydid Kingfisher Kiwi Kudu Larch Lavender Linden Lupine Macaw Manatee Mayfly Mistletoe Mongoose Narwhal ' +
  'Nutmeg Oriole Pangolin Peony Petrel Pika Poppy Quokka Redwood Reindeer Rosemary Sequoia Skylark Sorrel Spoonbill Sunflower Tapir Thyme Toad ' +
  'Vireo Wagtail Waxwing Whippet Wisteria Woodpecker Zinnia Aurora Basalt Bluff Cascade Cavern Cliff Cove Crest Crystal Dawn Dusk Fell Frost Gale ' +
  'Gorge Hearth Inlet Knoll Ledge Marsh Mist Moor Plateau Rapids Reef Shoal Slope Spring Stream Tide Trail Tundra Vale Wharf').split(' ');
