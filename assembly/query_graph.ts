import { http } from "@hypermode/modus-sdk-as";
import { RequestOptions } from "@hypermode/modus-sdk-as/assembly/http";
import { JSON } from "json-as";

@json
class Company {
  @alias("id")
  id!: string;

  @alias("name")
  name!: string;
}
@json
class Data {
    fields: string[] = [];
    values: string[][] = [];
}
@json
class Result {
    data: Data = new Data();
}
@json
class Statement {
    @alias("statement")
    statement!: string;

    @alias("parameters")
    parameters: Map<string, string> = new Map<string, string>();
}

function query_database(query:String, parameters:Map<string,string>): Result {
    const request = new http.Request("https://diffbot.neo4jlabs.com:7473/db/neo4j/query/v2", 
    {method: "POST", 
     headers: http.Headers.from([[ "Content-Type", "application/json" ]]),
     body: http.Content.from<Statement>( {"statement": query, "parameters": parameters}  as Statement )
    } as http.RequestOptions);


  console.log(String.UTF8.decode(request.body));    
  const response = http.fetch(request);
  if (!response.ok) {
    throw new Error(
      `Failed to fetching query ${query}. Received: ${response.status} ${response.statusText}`,
    );
  }

  // the API returns an array of quotes, but we only want the first one
  const result = response.json<Result>();
  console.log(JSON.stringify(result));
  return result;
}
// this function makes a request to an API that returns data in JSON format, and
// returns an object representing the data
export function getCompany(name: string): Company[] {
    // call db.index.fulltext.queryNodes('entity',$name, {limit:20}) yield node as c
    const query = `
        MATCH (c:Organization) WHERE c.name = $name RETURN c.id as id, c.name as name LIMIT 1
    `;
    const parameters = new Map<string, string>();
    parameters.set("name", name);
    const result = query_database(query, parameters);
    return result.data.values.map<Company>((values:string[]) => {return {id: values[0], name: values[1]} as Company});
}

@json
class Article {
  id!: string;
  title!: string;
  author!: string;
  score!: number;
}

export function getNews(text: string): Article[] {
    // call db.index.fulltext.queryNodes('entity',$name, {limit:20}) yield node as c
    const embedding = embedText(text);
//    console.log(JSON.stringify(embedding));
    const query = `
        call db.index.vector.queryNodes('news', 5, apoc.convert.fromJsonList($embedding)) yield node as c, score
        match (c)<-[:HAS_CHUNK]-(a)
        RETURN a.id as id, a.title as title, a.author as author, toString(score)
    `;
    console.log(query);
    const parameters = new Map<string, string>();
    parameters.set("embedding", JSON.stringify(embedding));
    const result = query_database(query, parameters);
    console.log(JSON.stringify(result));
    return result.data.values.map<Article>((values:string[]) => {return {id: values[0], title: values[1], author: values[2], score: parseFloat(values[3])} as Article});
}


import { models } from "@hypermode/modus-sdk-as"
import {
  OpenAIChatModel,
  ResponseFormat,
  SystemMessage,
  UserMessage,
} from "@hypermode/modus-sdk-as/models/openai/chat"

import {
    OpenAIEmbeddingsModel,
    Embedding,
  } from "@hypermode/modus-sdk-as/models/openai/embeddings"
  

export function generateText(instruction: string, prompt: string): string {
  const model = models.getModel<OpenAIChatModel>("text-generator")
  const input = model.createInput([
    new SystemMessage(instruction),
    new UserMessage(prompt),
  ])

  // this is one of many optional parameters available for the OpenAI chat interface
  input.temperature = 0.7

  const output = model.invoke(input)
  return output.choices[0].message.content.trim()
}

export function embedText(text:string): f32[] {
    const model = models.getModel<OpenAIEmbeddingsModel>("text-embedder")
    const input = model.createInput(text);
  
    const output = model.invoke(input)
    return output.data[0].embedding;
}
  