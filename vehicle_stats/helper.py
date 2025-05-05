from django.db import connections
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse, HttpResponse, QueryDict
from datetime import datetime
from credential import fsprod04
import pyodbc
import csv
import os
import sqlalchemy
import urllib
import numpy as np
import pandas as pd
import time
import numpy.ma as ma
import binascii

va_area_list = ['CMP', 'CVD', 'DIFFUSION', 'DRY ETCH',
                'IMPLANT', 'PHOTO', 'PVD', 'WET PROCESS']

'''
# Query functions
def queryToDict(query):
    #try:
    connection = connections['default']
    cursor = connection.cursor()
    connection.connection.enable_load_extension(True)
    connection.connection.load_extension(os.getcwd() + '\management\extensions\math.dll')
    cursor.execute(query)

    columns = [col[0] for col in cursor.description]
    #df = pd.DataFrame.from_dict([dict(zip(columns, row)) for row in cursor.fetchall()])

    data = [dict(zip(columns, row)) for row in cursor.fetchall()]
    cursor.close()

    return data
'''
'''
# Query : use 
    output Type     | Query
    ----------------|-------------------------
    Dict/JSON/Object| queryToDictServer(query)
    Dataframe-Python| queryToDF(query)
    ------------------------------------------
# Insert Data: use sqlconnection(servername) with conjunction of writesql()
'''

# Return SQL Engine -> needed for Inserting Data Function (writesql())


def sqlconnection(server_credential):
    user_chos = server_credential
    Server = user_chos["Server"]
    Database = user_chos["Database"]
    Uid = user_chos["Uid"]
    Pwd = user_chos["Pwd"]
    connection_string = "DRIVER={SQL Server};SERVER=%s;DATABASE=%s;UID=%s;PWD=%s;" % (
        Server, Database, Uid, Pwd)
    connection_string = urllib.parse.quote_plus(connection_string)
    connection_string = "mssql+pyodbc:///?odbc_connect=%s" % connection_string
    engine = sqlalchemy.create_engine(
        connection_string, use_setinputsizes=False)
    return engine



# Return SQL Connection -> needed for Query Type Function (queryToDictServer(query) & queryToDF(query))


def engineConn(server_credential):
    prod06_engine = sqlconnection(server_credential)
    connection = prod06_engine.raw_connection()

    print('connection successful 123')
    return (connection)


'''
# Purpose   :to Execute SQL query and returning Output as dictionary for Angular
# Use Case  :
    1. Output to a format (known as JSON/Dictionary/Object) that is readable by Angular
    2. Require to apply Function/Library that is more efficient on this format  
'''


# def queryToDictServer(query):
#     prod170_engine = sqlconnection(fsprod04)

#     connection = prod170_engine.raw_connection()

#     cursor = connection.cursor()
#     cursor.execute(query)

#     print("description: "+cursor.description)

#     columns = [col[0] for col in cursor.description]

#     data = [dict(zip(columns, row)) for row in cursor.fetchall()]
#     cursor.close()

#     return data

def queryToDictServer(query):
    prod170_engine = sqlconnection(fsprod04)
    connection = prod170_engine.raw_connection()
    cursor = connection.cursor()
    cursor.execute(query)

    # Print cursor.description to understand its structure
    print("Cursor description:", cursor.description)

    # Extract column names from cursor.description
    columns = [col for col in cursor.description]
    print("Extracted columns:", columns)  # Print extracted columns for debugging

    data = [dict(zip(columns, row)) for row in cursor.fetchall()]
    cursor.close()

    return data


def queryToDictbyScript(filename, server_credential, params=None):
    connection = engineConn(server_credential)

    with open(filename, 'r') as sql_file:
        query = sql_file.read()

    data = execute_query(connection, query, params)

    return data


def execute_query(connection, query, params=None):  # params can be dictionary or list
    try:
        cursor = connection.cursor()
        cursor.execute(query)

        # Check if cursor.description is None
        if cursor.description is None:
            print('No results returned from the query.')
            return []

        # Print cursor.description to understand its structure
        print("Cursor description:", cursor.description)

        # Extract column names from cursor.description
        columns = [column for column in cursor.description]
        print("Extracted columns:", columns)  # Print extracted columns for debugging

        data = []
        for row in cursor.fetchall():
            row_dict = {}
            for idx, col in enumerate(columns):
                row_dict[col] = row[idx]
            data.append(row_dict)
        
        cursor.close()

        return data

    except pyodbc.Error as e:
        print('Database error:', e)
        connection.close()  # error comes up, close the connection
        raise

    except Exception as e:
        print('█████CHECK QUERY BELOW█████\n', query,
              '\n', '█████CHECK QUERY ABOVE\n█████')
        print(e)
        connection.close()  # error comes up, close the connection
        raise
'''
# Purpose   :to Execute SQL query and returning Output as dataframe
# Use Case  :
    1. Perform joining operation on the output of two different query data sources
    2. Perform computing intensive operation on the output of query data
'''


def queryToDF(query, server_credential):

    connection = engineConn(server_credential)

    data_df = pd.read_sql(query, connection)

    connection.close()
    # cursor = connection.cursor()
    # cursor.execute(query)

    # columns = [col[0] for col in cursor.description]

    # data = [dict(zip(columns, row)) for row in cursor.fetchall()]
    # cursor.close()

    return data_df


'''
# Purpose   :to Execute SQL File without returning Output
# Use Case  :
    1. Update existing Table
    2. Perform operation for child Table before joining
'''


def runQuery(query, tableName, server_credential):

    print('[PROD06] Updating ' + tableName + ' table...')

    connection = engineConn(server_credential)
    cursor = connection.cursor()
    cursor.execute(query)
    cursor.commit()
    print('[PROD06] ' + tableName + ' table updated at',
          datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
    cursor.close()


def writesql(df, table, server_credential, schema, mode='append', chunksize=75):
    engine = sqlconnection(server_credential)
    df.to_sql(table, engine, schema=schema, if_exists=mode,
              chunksize=chunksize, index=False)
    print(f'Writing df of {df.shape} to {table} is successful')
