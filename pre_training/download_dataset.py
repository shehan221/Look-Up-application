from icrawler.builtin import BingImageCrawler

locations = [
"Sigiriya Sri Lanka",
"Galle Fort Sri Lanka",
"Temple of the Tooth Kandy",
"Dambulla Cave Temple Sri Lanka",
"Nine Arch Bridge Ella",
"Mihintale Sri Lanka",
"Ruwanwelisaya Anuradhapura",
"Kelaniya Raja Maha Vihara",
"Yala National Park Sri Lanka",
"Mirissa Beach Sri Lanka",
"Unawatuna Beach Sri Lanka",
"Arugam Bay Sri Lanka",
"Udawalawe National Park",
"Gal Viharaya Polonnaruwa",
"Ravana Falls Ella",

# ⭐ NEW RELIGIOUS LOCATIONS
"Gangaramaya Temple Colombo",
"Jaya Sri Maha Bodhi Anuradhapura",
"Seetha Amman Temple Nuwara Eliya",
"Nagadeepa Temple Nainativu",
"Madu Church Mannar"
]

for place in locations:

    folder = place.replace(" ","_")

    print("Downloading:", place)

    crawler = BingImageCrawler(
        storage={'root_dir': f'dataset/{folder}'}
    )

    crawler.crawl(
        keyword=place,
        max_num=20
    )

print("Dataset download complete")