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

function query_database<T>(query:String, parameters:Map<string,string>, cb:(values:string[])=>T): T[] {
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
  return result.data.values.map<T>((values:string[]) => cb(values));
}
// this function makes a request to an API that returns data in JSON format, and
// returns an object representing the data
export function getCompany(name: string): Company[] {
    // call db.index.fulltext.queryNodes('entity',$name, {limit:20}) yield node as c
    const query = `
        MATCH (c:Organization) RETURN c.id as id, c.name as name LIMIT 1
    `;
    const parameters = new Map<string, string>();
    parameters.set("name", name);
    return query_database<Company>(query, parameters, (value:string[]) =>  {return {id: value[0], name: value[1]} as Company});
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

export function embedText(text:string): Embedding {
    const model = models.getModel<OpenAIEmbeddingsModel>("text-embedder")
    const input = model.createInput(text);
  
    const output = model.invoke(input)
    return output.data[0];
}
  