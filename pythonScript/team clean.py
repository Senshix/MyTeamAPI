import os
import json
import pandas as pd


def load_data(folder_path):
    dataframes = []
    for filename in os.listdir(folder_path):
        if filename.endswith('.xlsx') and 'Team Stats' in filename:
            team_name = filename.replace('Team Stats', '').split('.')[0].strip()
            df = pd.read_excel(os.path.join(folder_path, filename))
            dataframes.append(df)
    return pd.concat(dataframes, axis=0, ignore_index=True)


def rename_columns(df):
    with open('column_mapping.json', 'r') as mapping_file:
        columns_mapping_dict = json.load(mapping_file)
    return df.rename(columns=columns_mapping_dict)

def drop_columns(data):
    columns_to_drop = [
        'Passes progressives précises', 'Passes progressives précises, %',
        'Passes astucieuses', 'Passes astucieuses précises', 'Passes astucieuses précises, %',
        'Passes arrière', 'Passes arrière précises', 'Passes arrière précises, %',
        'Passes longues', 'Passes longues précises', 'Passes longues précises, %',
        'Passes latérales', 'Passes latérales précises', 'Passes latérales précises, %',
        'Remises en jeu', 'Remises en jeu précises', 'Remises en jeu précises, %',
        'Passes en avant précises, %', 'Duels aériens gagnés, %', 'Duels défensifs gagnés, %',
        'Centres précis, %', 'Coups francs avec tirs, %', 'Récupérations de balle',
        'Pertes de balle', 'Hors-jeu', 'Passes dans 3ème tiers',
        "Tirs de l'extérieur de la surface cadrés, %", 'Coups de pied arrêtés avec tirs, %',
        'Contre-attaques avec tirs', 'Corners avec tirs, %',
        'Penaltys convertis, %', 'Passes dans 3ème tiers précises', 'Passes dans 3ème tiers précises, %',
        'Tirs contre cadrés, %', 'Rythme du match'
    ]
    data = data.drop_duplicates().dropna()
    return data.drop(columns=columns_to_drop)


def construct_columns(data):
    data['ID'] = data['Équipe'] + '_' + data['Date'].str.replace('-', '')
    data[['formation', 'formation_perc']] = data['Projet'].str.extract(r'(\d+-\d+-\d+|\d+-\d+-\d+-\d+) \((\d+\.\d+)%\)')


def aggregate_data(data):
    percentage_columns = [col for col in data.columns if '%' in col]
    sum_columns = [col for col in data.columns if col not in percentage_columns]
    mean_columns = percentage_columns
    
    aggregated_df = data.groupby('Équipe').agg({
        **{col: 'sum' for col in sum_columns},
        **{col: 'mean' for col in mean_columns},
    })

    return aggregated_df


def convert_column_types(data):
    string_columns = ['Match', 'Compétition', 'Équipe', 'formation']
    data[string_columns] = data[string_columns].astype(str)
    
    data['Date'] = pd.to_datetime(data['Date'])
    numeric_columns = [col for col in data.columns if col not in string_columns and col != 'Date']
    data[numeric_columns] = data[numeric_columns].apply(pd.to_numeric, errors='coerce')



def clean(folder_path='data/'):
    data = load_data(folder_path)
    data = rename_columns(data)
    data = drop_columns(data)

    #extracting XG against by grouping by date and match and shifting the xg column
    data['xg_shifted'] = data.groupby(['Match', 'Date'])['xG'].shift(1)
    data['xg_shifted'] = data['xg_shifted'].fillna(0)

    data['xg_next'] = data.groupby(['Match', 'Date'])['xG'].shift(-1)
    data['xg_next'] = data['xg_next'].fillna(0)
    data['XG_against'] = data['xg_shifted'] + data['xg_next']

    final_columns= [
    'Match', 'Date', 'Équipe','Projet',
    # for 
    'Buts', 'xG', 'Tirs', 'Tirs cadrés',
    "Tirs de l'extérieur de la surface","Tirs de l'extérieur de la surface cadrés",
    'Contre-attaques', 'Contre-attaques avec tirs, %', 'Corners', 'Corners avec tirs','Coups francs', 
    'Coups francs avec tirs', 'Penaltys','Penaltys convertis','Duels offensifs','Duels offensifs gagnés',
        
    "R.Bas", "R.Moyen", "R.Élevé", "P.Bas", "P.Moyen", "P.Élevé", "Attaques positionnelles", 
    "Attaques positionnelles avec tirs, %",
        
    'Passes','Passes complétes','Passes en avant', 'Passes en avant précises', 'Possession, %',

    'Duels défensifs','Duels défensifs gagnés','Duels','Duels gagnés',
    'Tacles glissés', 'Tacles glissés réussis', 'Fautes', 'Cartons jaunes','Cartons rouges',
    # against
    'Buts concédés','Tirs contre', 'Tirs contre cadrés', 'XG_against'
    ]

    col_str= ['Match','Équipe', 'Projet']
    col_date= ['Date']
    col_float= [x for x in final_columns if x not in col_str and x not in col_date]

    final_df= data[final_columns]
    for c in col_str:
        final_df[c]= final_df[c].astype('string')

    for c in col_date:
        final_df[c]= pd.to_datetime(final_df[c], errors='coerce')

    for c in col_float:
        final_df[c]= final_df[c].astype(float)

    return final_df


# this function will return a fixtures result
def fixtures_result(data):
    df= data.copy()
    df= df[["Date", 'Match']]
    split_data= df['Match'].str.split('-', expand= True)
    df['home_team']= split_data[0].str.strip()
    df['away_team']= split_data[1].str.split(' ', n=1).str[1].str.strip()
    df[['away_team', 'home_team_goal', 'away_team_goal']]=df['away_team'].str.extract(r'^(.*?) (\d+):(\d+)$')
    df['home_team']= df['home_team'].astype(str)
    df['away_team']= df['away_team'].astype(str)
    df['home_team_goal']= df['home_team_goal'].astype(int)
    df['away_team_goal']= df['away_team_goal'].astype(int)
    df.rename(columns={'Date':'date'}, inplace= True)
    df=df.drop_duplicates()
    df.drop('Match', axis=1, inplace= True)
    return df

# Botola Pro Team Table 
def Botola_table(data):
    df= fixtures_result(data)
    teams= df['Home Team'].unique()
    BotolaPro_talbes= pd.DataFrame({'Team': teams, 'Played': 0, 'Points': 0, 'Wins': 0, 'Losses': 0, 'Draws': 0, 'GF': 0, 'GA': 0})
    for index, row in df.iterrows():
        home_team= row['Home Team']
        away_team= row['Away Team']
        home_goals= row['Home Team Goal']
        away_goals= row['Away Team Goal']

        # update botola pro table
        BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == home_team, 'GF'] += home_goals
        BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == home_team, 'GA'] += away_goals

        BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == away_team, 'GF'] += away_goals
        BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == away_team, 'GA'] += home_goals

        BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == home_team, 'Played'] +=1
        BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == away_team, 'Played']+=1

        if home_goals > away_goals:
            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == home_team, 'Wins'] +=1
            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == home_team, 'Points'] +=3
            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == away_team, 'Losses'] +=1

        elif home_goals < away_goals:
            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == away_team, 'Wins'] +=1
            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == away_team, 'Points'] +=3
            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == home_team, 'Losses'] += 1

        else:
            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == home_team, 'Draws'] +=1
            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == home_team, 'Points'] +=1

            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == away_team, 'Draws'] +=1
            BotolaPro_talbes.loc[BotolaPro_talbes['Team'] == away_team, 'Points'] +=1

    BotolaPro_talbes= BotolaPro_talbes.sort_values(by= 'Points', ascending= False)
    BotolaPro_talbes= BotolaPro_talbes.reset_index(drop=True)
    return BotolaPro_talbes

# function will return a team technical team sheet 
def team_technical_sheet(data, team_name= 'Chabab Mohammédia', per='SA'):
    data= data.drop('Match', axis=1)
    team_sheet= data[data['Équipe'] == team_name]

    if per == 'SA':
        team_sheet= team_sheet.sort_values(by= ['xG', 'Buts', 'Tirs cadrés'], ascending=[False, False, False])
        return team_sheet

    elif per == 'WA':
        team_sheet= team_sheet.sort_values(by= ['xG', 'Buts', 'Tirs cadrés'], ascending=[True, True, True])
        return team_sheet

    elif per == 'SD':
        team_sheet= team_sheet.sort_values(by= ['Buts concédés', 'XG_against', 'Tirs contre cadrés'], ascending= [True, True, True])
        return team_sheet

    elif per == 'WD':
        team_sheet= team_sheet.sort_values(by= ['Buts concédés', 'XG_against', 'Tirs contre cadrés'], ascending= [False, False, True])
        return team_sheet

    else:
        return team_sheet

#outcome of the dataframe cleaning 
df_1= clean(folder_path= 'Input/teams_data')


