import pandas as pd
# country_partner = pd.read_csv("clean_country_partner_hsproductsection_year.csv")
# location = pd.read_csv("location.csv")

# merge1 = pd.merge(country_partner, location, 
#                    on='location_code', 
#                    how='inner')
# print(merge1)
# merge1.to_csv("merge1", encoding="utf-8")

# product = pd.read_csv("hs_product.csv")
# print(product)
# df = pd.read_csv("merge1.csv")
# merge2 = pd.merge(df, product,
#                     on='hs_product_code', 
#                     how='inner')
# del merge2['Unnamed: 0']
# print(merge2)
# merge2.to_csv("merge.csv", encoding="utf-8")              
# print(merge2)

merge = pd.read_csv("merge_data.csv")
df = merge.groupby(['year','location_name_short_en', "hs_product_name_short_en"])["export_value", "import_value"].apply(lambda x : x.astype(int).sum())
df.to_csv("merge.csv", encoding="utf-8")  
